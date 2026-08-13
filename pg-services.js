const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Pool } = require("pg");
const cron = require("node-cron");
const child_process = require("child_process");
const process = require("process");

const dotenvHelper = require("../../helpers/dotenvHelper");

const configListener = require("./pg-services/configListener");
const pgHanlder = require("./pg-services/pgHanlder");
const winstonLogger = require("../../helpers/winstonLogger");
const coderun = require("./coderun");
const objectHelpers = require("../../helpers/objectHelpers");

const PGDATA_USER = process.env.PGDATA_USER || "";
const PGDATA_HOST = process.env.PGDATA_HOST || "";
const PGDATA_DATABASE = process.env.PGDATA_DATABASE || "";
const PGDATA_PASSWORD = process.env.PGDATA_PASSWORD || "";
const PGDATA_PORT = process.env.PGDATA_PORT || "";

const APPLICATION_NAME = "pg-services-emr-dhs";

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
  user: PGDATA_USER,
  host: PGDATA_HOST,
  database: PGDATA_DATABASE,
  password: PGDATA_PASSWORD,
  port: PGDATA_PORT || 5432,

  // 🔧 POOL SIZE CONFIGURATION
  max: 20, // Tăng max connections (default: 10)
  min: 2, // Maintain minimum connections

  // ⏰ TIMEOUT CONFIGURATIONS
  idleTimeoutMillis: 0, // 🚨 QUAN TRỌNG: Không timeout idle connections cho LISTEN
  connectionTimeoutMillis: 10000, // 10s timeout khi tạo connection
  acquireTimeoutMillis: 60000, // 60s timeout khi acquire connection từ pool

  // 💓 KEEP-ALIVE SETTINGS (Quan trọng cho long-lived connections)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10s delay trước keep-alive đầu tiên

  // 🔗 APPLICATION NAME (để dễ debug)
  application_name: APPLICATION_NAME,

  // 📝 QUERY TIMEOUT
  query_timeout: 60000, // 60s timeout cho mỗi query
  statement_timeout: 60000, // 60s timeout cho statement

  // 🔄 RECONNECTION SETTINGS
  maxUses: 7500, // Max số lần sử dụng 1 connection trước khi recreate
  maxLifetimeSeconds: 3600, // Max 1 hour lifetime cho mỗi connection
});
let client; // 💡 Biến toàn cục cho listener client

const RETRY_INTERVAL = parseInt(process.env.RETRY_INTERVAL || "300000", 10); // 5 phút mặc định
const MAX_RETRY_COUNT = parseInt(process.env.MAX_RETRY_COUNT || "5", 10); // Số lần thử lại tối đa
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "10", 10); // Số lượng thông báo xử lý mỗi lần

//Kiểm tra cấu trúc và thực hiện các nghiệp vụ riêng
const EXECUTE_CREATETABLE = objectHelpers.parseBooleanParam(process.env.EXECUTE_CREATETABLE || false);

const EXECUTE_SYCN_ALL_DANHMUC = process.argv.includes("--syncAllDanhMuc") === true;
const EXECUTE_SYCN_BNNOITRU = process.argv.includes("--syncBnnoitru") === true;
const EXECUTE_EXPORT_SQL_CREATETABLE = process.argv.includes("--exportSQLCreateTable") === true;

const EXECUTE_PSDANGKY_SYNCDCHG = process.argv.includes("--psdangkySyncDCHG") === true;
const EXECUTE_CHECK_HOSO_EMR = process.argv.includes("--checkHosoEMR") === true;
const EXECUTE_PROCESS_NOTIFICATIONS = process.argv.includes("--processUnprocessedNotifications") === true;

const EXECUTE_IS_MAIN = (() => {
  return !process.argv.slice(2).some((arg) => arg.startsWith("--"));
})();

const utils = (() => {
  const getAppPath = () => {
    // Ưu tiên pm_exec_path khi chạy qua PM2
    if (process.env.pm_exec_path) {
      return process.env.pm_exec_path;
    }

    // Fallback về require.main.filename
    if (require.main && require.main.filename) {
      return require.main.filename;
    }

    // Cuối cùng dùng process.argv[1]
    return process.argv[1];
  };
  return {
    getAppPath,
  };
})();
const cleanUpPgPool = async () => {
  winstonLogger.logInfo("🧹 Starting cleanup...");
  // 1. Unlisten channels
  if (client) {
    try {
      await client.query("UNLISTEN *");
      winstonLogger.logInfo("✅ Unlistened all channels");
    } catch (err) {
      winstonLogger.logError(err, "Failed to unlisten");
    }
    // 2. Release client
    try {
      client.release();
      winstonLogger.logInfo("✅ Client released");
    } catch (err) {
      winstonLogger.logError(err, "Failed to release client");
    }
  }

  // 3. Close pool
  if (pool) {
    try {
      await pool.end();
      winstonLogger.logInfo("✅ Pool closed");
    } catch (err) {
      winstonLogger.logError(err, "Failed to close pool");
    }
  }
  winstonLogger.logInfo("✅ Cleanup completed");
};
const initializeShutdownService = (() => {
  let isShuttingDown = false;
  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
      winstonLogger.logWarn(`⚠️ Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    winstonLogger.logInfo(`📴 ${signal} received - Shutting down gracefully...`);

    const excuteProcessExit = async (code = 0) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(code);
    };
    try {
      await cleanUpPgPool();
      winstonLogger.logInfo("✅ Graceful shutdown completed");
      await excuteProcessExit(0);
    } catch (error) {
      winstonLogger.logError(error, "❌ Error during shutdown");
      await excuteProcessExit(1);
    }
  };
  // Ctrl+C từ terminal
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  // Kill command, PM2 stop, Docker stop
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  // Lỗi chưa được catch
  process.on("uncaughtException", async (error) => {
    winstonLogger.logError(error, "💥 Uncaught Exception");
    await gracefulShutdown("uncaughtException");
  });
  // Promise rejection chưa được handle
  process.on("unhandledRejection", async (reason, promise) => {
    winstonLogger.logError(reason instanceof Error ? reason : new Error(String(reason)), "💥 Unhandled Rejection");
    await gracefulShutdown("unhandledRejection");
  });
  // Process warning (memory leaks, etc)
  process.on("warning", (warning) => {
    winstonLogger.logWarn(`⚠️ Process Warning: ${warning.name} - ${warning.message}`);
  });
  winstonLogger.logInfo("✅ Shutdown service initialized");
  return {
    gracefulShutdown,
  };
})();
const initializeListener = (async () => {
  let isListenRunning = false;
  let timeoutId = -1;
  const retryInitListener = () => {
    isListenRunning = false;
    if (timeoutId === -1) {
      timeoutId = setInterval(initListener, 5000); // Thử kết nối lại sau 5 giây
    }
  };
  const retryInitListenerOK = () => {
    clearInterval(timeoutId);
    isListenRunning = true;
    timeoutId = -1;
  };
  async function initListener() {
    // 1. Log trạng thái TRƯỚC khi yêu cầu kết nối mới
    // winstonLogger.logInfo(`--- TRƯỚC CONNECT --- Số kết nối đang chờ/tổng: ${pool.waitingCount}/${pool.totalCount}`);
    try {
      // Kết nối chính để thực hiện LISTEN
      client = await pool.connect();

      // 2. Log trạng thái SAU khi lấy kết nối thành công
      // winstonLogger.logInfo(`--- SAU CONNECT --- Số kết nối đang chờ/tổng: ${pool.waitingCount}/${pool.totalCount}`);
      pgHanlder.initializePgClient(client);
      pgHanlder.initializePgPool(pool);

      let exitProcessBy = ``;
      const checkTable = await (async () => {
        if (EXECUTE_PROCESS_NOTIFICATIONS === true) return;
        const { successDir, needDir } = (() => {
          const dirPath = path.join(process.cwd(), "CheckTableStore");
          const successDir = path.join(dirPath, "successDir");
          const needDir = path.join(dirPath, "needDir");
          try {
            fs.mkdirSync(successDir, { recursive: true });
            //Xóa file trong needDir
            if (fs.existsSync(needDir)) {
              fs.readdirSync(needDir).forEach((file) => {
                const delFilePath = path.join(needDir, file);
                try {
                  fs.rmSync(delFilePath, { recursive: true, force: true });
                } catch (error) {
                  winstonLogger.logError(error, `Lỗi xóa file trong checkTable.needDir: ${delFilePath}`);
                }
              });
            } else {
              fs.mkdirSync(needDir, { recursive: true });
            }
            return { successDir, needDir };
          } catch (error) {
            winstonLogger.logError(`Lỗi khi tạo thư mục ${dirPath}: ${error.message}`);
            throw error;
          }
        })();
        const hashSha256 = (str) => crypto.createHash("sha256").update(str).digest("hex");
        var arrSQL = configListener.SQL.initSQLs;
        var arrNeedSQL = [];
        winstonLogger.logInfo(`Đang kiểm tra cấu trúc SQL cần cập nhật: [count: ${arrSQL.length}] ....`);
        for (let i = 0; i < arrSQL.length; i++) {
          let sqlItem = arrSQL[i];
          let hashName = hashSha256(sqlItem);
          let hashFilePath = path.join(successDir, `${hashName}.sql`);
          // Kiểm tra file gốc và các file có prefix số
          const fileExists = (() => {
            try {
              if (fs.existsSync(hashFilePath)) return true;
              const files = fs.readdirSync(successDir);
              return files.some((file) => {
                // Pattern: số.hashName.sql (ví dụ: 01.abc123.sql, 02.abc123.sql)
                const pattern = new RegExp(`^\\d{2}\\.${hashName}\\.sql$`);
                return pattern.test(file);
              });
            } catch (error) {
              winstonLogger.logError(error, `Lỗi kiểm tra fileExists[${i}/${arrSQL.length}]: ${hashFilePath}`);
              return false;
            }
          })();

          if (fileExists) continue;

          let nameFileInNeedDir = `${(i + 1).toString().padStart(2, "0")}.${hashName}.sql`;
          fs.writeFileSync(path.join(needDir, `${nameFileInNeedDir}`), sqlItem, { encoding: "utf8" });
          arrNeedSQL.push({
            nameFileInNeedDir,
            hashName,
            sqlItem,
          });
        }
        if (EXECUTE_CREATETABLE !== true) {
          winstonLogger.logInfo(`Không thực hiện checkTable do EXCUTE_CREATETABLE = ${EXECUTE_CREATETABLE}`);
          return;
        }
        if (arrNeedSQL.length === 0) {
          winstonLogger.logInfo(`Đã cập nhật hết cấu trúc!!!`);
          return;
        }
        const arrNeedSQLCount = arrNeedSQL.length;
        for (let i = 0; i < arrNeedSQL.length; i++) {
          let { sqlItem, hashName, nameFileInNeedDir } = arrNeedSQL[i];
          let hashFilePath = path.join(successDir, `${hashName}.sql`);
          const saveSuccessHash = () => {
            fs.writeFileSync(hashFilePath, sqlItem, { encoding: "utf8" });
            let filePathInNeedDir = path.join(needDir, nameFileInNeedDir);
            if (fs.existsSync(filePathInNeedDir)) {
              try {
                fs.rmSync(filePathInNeedDir, { recursive: true, force: true });
              } catch (error) {
                winstonLogger.logError(error, `Lỗi xóa file trong checkTable.saveSuccessHash: ${filePathInNeedDir}`);
              }
            }
          };
          try {
            winstonLogger.logInfo(`Cập nhật SQL cấu trúc: [${i + 1}/${arrNeedSQLCount}] ....`);
            await client.query(sqlItem);
            saveSuccessHash();
          } catch (error) {
            try {
              //Xử lý đối với PostgresSQL 9.4
              if (error.code === "42601" && error.message && error.message.toLowerCase().includes('syntax error at or near "function"')) {
                winstonLogger.logWarn(`Phát hiện lỗi syntax FUNCTION: ${error.message}`);
                winstonLogger.logInfo(`Thực hiện lại đổi ' EXECUTE FUNCTION '=>' EXECUTE PROCEDURE ' checkTable [${i + 1}/${arrNeedSQLCount}]....`);
                sqlItem = sqlItem.replace("EXECUTE FUNCTION", "EXECUTE PROCEDURE");
                await client.query(sqlItem);
                saveSuccessHash();
              } else {
                winstonLogger.logError(error, `Error checkTable`);
                winstonLogger.logInfo(sqlItem, `Error SQL`);
              }
            } catch (errorChild) {
              winstonLogger.logError(errorChild, `Child Error checkTable`);
              winstonLogger.logInfo(sqlItem, `Child Error SQL`);
            }
          }
        }
      })();
      const executeSyncAllDanhMuc = await (async () => {
        try {
          if (EXECUTE_SYCN_ALL_DANHMUC !== true) return;
          let syncTable = (() => {
            const syncArg = process.argv.find((arg) => arg.startsWith("current"));
            return syncArg ? syncArg : "";
          })();
          await pgHanlder.syncAllDanhMuc(syncTable);
          exitProcessBy = `--syncAllDanhMuc`;
        } catch (error) {
          winstonLogger.logError(error, `syncAllDanhMuc`);
        }
      })();
      const executeSyncBnnoitru = await (async () => {
        try {
          if (EXECUTE_SYCN_BNNOITRU !== true) return;
          await pgHanlder.syncBnnoitru();
          exitProcessBy = `--syncBnnoitru`;
        } catch (error) {
          winstonLogger.logError(error, `syncBnnoitru`);
        }
      })();
      const executeExportSQLCreateTable = await (async () => {
        try {
          if (EXECUTE_EXPORT_SQL_CREATETABLE !== true) return;
          var arrSQL = configListener.SQL.initSQLs;
          let dirPath = path.join(process.cwd(), "exportSQLCreateTable");
          if (fs.existsSync(dirPath) !== true) fs.mkdirSync(dirPath, { recursive: true });
          for (let i = 0; i < arrSQL.length; i++) {
            fs.writeFileSync(path.join(dirPath, `${i + 1}.sql`), arrSQL[i]);
          }
        } catch (error) {
          winstonLogger.logError(error, `executeExportSQLCreateTable`);
        }
        exitProcessBy = `--executeExportSQLCreateTable`;
      })();
      const executePsdangkySyncDCHG = await (async () => {
        try {
          if (EXECUTE_PSDANGKY_SYNCDCHG !== true) return;
          await pgHanlder.psdangkySyncDCHG();
          exitProcessBy = `--psdangkySyncDCHG`;
        } catch (error) {
          winstonLogger.logError(error, `psdangkySyncDCHG`);
        }
      })();
      const executeCheckHosoEMR = await (async () => {
        try {
          if (EXECUTE_CHECK_HOSO_EMR !== true) return;
          await pgHanlder.checkHosoEMR();
          exitProcessBy = `--checkHosoEMR`;
        } catch (error) {
          winstonLogger.logError(error, `checkHosoEMR`);
        }
      })();
      const execute_process_notifications = await (async () => {
        try {
          if (EXECUTE_PROCESS_NOTIFICATIONS !== true) return;
          exitProcessBy = `--processUnprocessedNotifications`;
          winstonLogger.logInfo(`===execute_process_notifications===`);
          winstonLogger.logInfo(`===RETRY_INTERVAL:${RETRY_INTERVAL}===`);

          async function startNotificationProcessing() {
            await pgHanlder.processUnprocessedNotifications(MAX_RETRY_COUNT);
            return;
          }
          // Bắt đầu chạy quá trình
          await startNotificationProcessing();
        } catch (error) {
          winstonLogger.logError(error, `processUnprocessedNotifications`);
        }
      })();
      if (exitProcessBy !== "") {
        await initializeShutdownService.gracefulShutdown(`${exitProcessBy}`);
        return;
      }
      const saveCodeRun = await (async () => {
        try {
          coderun.dotEnvToCodeRun(process.env["CODE_RUN_KEY"] || "badt");
        } catch (error) {
          winstonLogger.logError(error, "saveCodeRun");
        }
      })();

      if (isListenRunning === true) return;
      // Đăng ký lắng nghe kênh thông báo
      await client.query(`LISTEN ${configListener.pgListener.name}`);
      retryInitListenerOK();
      winstonLogger.logInfo(`Listening for changes on ${configListener.pgListener.name} ...`);

      // Xử lý sự kiện nhận thông báo
      client.on("notification", async (msg) => {
        try {
          const payload = JSON.parse(msg.payload);
          winstonLogger.logInfo(`client.on.notification: ${payload["notification_id"]}; ${payload["channel"]}`);
        } catch (error) {
          winstonLogger.logError(error, `client.on.notification`);
        }
        pgHanlder.queueNotification(msg);
      });

      // Xử lý đóng kết nối
      client.on("error", (err) => {
        winstonLogger.logError(err, `client.on.error:(isListenRunning:${isListenRunning}; timeoutId:${timeoutId})`);
        retryInitListener();
      });

      // Xử lý đóng kết nối
      client.on("end", async () => {
        winstonLogger.logError(
          new Error(`client.on.end: ⚠️ Client connection ended`),
          `client.on.end:(isListenRunning:${isListenRunning}; timeoutId:${timeoutId})`,
        );
        retryInitListener();
      });
    } catch (error) {
      winstonLogger.logError(
        error,
        `initListener.Exception: Failed to initialize listener: :(isListenRunning:${isListenRunning}; timeoutId:${timeoutId})`,
      );
      if(client) {
        try {
          client.release(true);
          winstonLogger.logInfo("✅ Client released after initListener error");
        } catch (releaseError) {
          winstonLogger.logError(releaseError, "Failed to release client");
        }
        client = null;
      }
      isListenRunning = false;
      retryInitListener();
    }
  }
  await initListener();
  winstonLogger.logInfo(`${APPLICATION_NAME}, version: ${process.env.WEBPACK_BUILD_VERSION}`);
  winstonLogger.logInfoObject({ PGDATA_HOST, PGDATA_DATABASE, PGDATA_PORT }, `Thông tin kết nối PostgreSQL:`);
})();
const initializeScheduledTask = (() => {
  if (EXECUTE_IS_MAIN !== true) return;
  //Chạy lúc 2h sáng hằng ngày, để chuyển psdangkySyncDCHG
  cron.schedule(
    "0 2 * * *",
    () => {
      const child = child_process.spawn("node", [__filename, "--psdangkySyncDCHG"], { stdio: "pipe" });
      winstonLogger.logInfo("Execute psdangkySyncDCHG started");
      child.stdout.on("data", (data) => winstonLogger.logInfoObject({ stdout: data.toString().trim() }, `psdangkySyncDCHG`));
      child.stderr.on("data", (data) => winstonLogger.logInfoObject({ stderr: data.toString().trim() }, `psdangkySyncDCHG`));
      child.on("close", (code) => winstonLogger.logInfo(`psdangkySyncDCHG ${code === 0 ? "completed" : "failed"} (${code})`));
      // Xử lý lỗi spawn
      child.on("error", (error) => winstonLogger.logError(`psdangkySyncDCHG spawn error: ${error.message}`));
      // Timeout protection - 10 phút
      const TIMEOUT_10_MINUTES = 10 * 60 * 1000; // 600,000ms
      setTimeout(() => {
        if (!child.killed) {
          winstonLogger.logInfo(`psdangkySyncDCHG timeout after ${TIMEOUT_10_MINUTES}(ms), terminating...`);
          child.kill("SIGTERM");
        }
      }, TIMEOUT_10_MINUTES);
    },
    {
      scheduled: true,
      timezone: "Asia/Ho_Chi_Minh", // Múi giờ Việt Nam
    },
  );
})();
const initializeProcessUnprocessedNotificationsTask = (() => {
  if (EXECUTE_IS_MAIN !== true) return;
  let currentChild = null; // Biến để theo dõi child process hiện tại
  let isRunning = false; // Biến để theo dõi trạng thái đang chạy
  const cleanCurrentChild = () => {
    // Reset trạng thái
    isRunning = false;
    currentChild = null;
  };
  winstonLogger.logInfo(`Khởi tạo processUnprocessedNotifications`);
  // Hàm khởi động tiến trình con
  // Hàm khởi động tiến trình con
  function startProcessUnprocessedNotifications() {
    // Kiểm tra nếu đã có child process đang chạy
    if (isRunning && currentChild) {
      winstonLogger.logInfo(`processUnprocessedNotifications đã đang chạy {${currentChild.pid}}`);
      return;
    }
    // Đánh dấu là đang chạy
    isRunning = true;

    winstonLogger.logInfo("Đang khởi động processUnprocessedNotifications...");

    currentChild = child_process.fork(utils.getAppPath(), ["--processUnprocessedNotifications"], { stdio: "pipe", cwd: process.cwd() });

    // Lắng nghe thông điệp từ tiến trình con
    currentChild.on("message", (message) => {
      winstonLogger.logInfo(`Tiến trình chính nhận được thông điệp: ${message}`);
      if (message.startsWith("is-lived-") && currentChild) {
        currentChild.send(`${message}`);
      }
    });

    // Xử lý khi tiến trình con kết thúc
    currentChild.on("close", (code) => {
      winstonLogger.logInfo(`processUnprocessedNotifications ${code === 0 ? "completed" : "failed"} (${code})`);
      cleanCurrentChild();
    });

    // Xử lý lỗi spawn
    currentChild.on("error", (error) => {
      winstonLogger.logError(`processUnprocessedNotifications fork error: ${error.message}`);
      cleanCurrentChild();
    });

    // Xử lý khi tiến trình con bị disconnect
    currentChild.on("disconnect", () => {
      winstonLogger.logInfo("processUnprocessedNotifications disconnected");
      cleanCurrentChild();
    });
  }
  const MUNITES_CRON_PROCESS_UNPROCESSED = parseInt(process.env.MUNITES_CRON_PROCESS_UNPROCESSED || "3", 10);

  // Pattern 6 phần: giây phút giờ ngày tháng thứ
  //                      ↓ Đây mới là phút
  cron.schedule(`0 */${MUNITES_CRON_PROCESS_UNPROCESSED} * * * *`, () => {
    winstonLogger.logInfo(`Khởi động processUnprocessedNotifications sau mỗi ${MUNITES_CRON_PROCESS_UNPROCESSED} phút...`);
    startProcessUnprocessedNotifications();
  });
  startProcessUnprocessedNotifications();
})();
