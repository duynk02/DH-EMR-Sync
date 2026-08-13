const fs = require("fs");
const path = require("path");
const { Pool, Client } = require("pg");

const winstonLogger = require("../../../helpers/winstonLogger");
const dhs = require("../dhs-api/dhs");
const configListener = require("./configListener");
const dhsPathApi = require("../dhs-api/dhsPathApi");
const objectHelpers = require("../../../helpers/objectHelpers");
const SequentialQueue = require("../../../helpers/SequentialQueue");
const typeValidators = require("../../../helpers/typeValidators");

// Tạo Pool mà không cần truyền thông tin kết nối trực tiếp
var pgPool = new Pool();
// Hoặc tạo Client mà không cần truyền thông tin kết nối trực tiếp
var pgClient = new Client();
// Xử lý tuần tự thông báo (dữ liệu thay đổi trong PostgreSQL)
var queue = SequentialQueue.createSequentialQueue();

const templateMsg = () => {
  return {
    length: 241,
    processId: 17868,
    channel: "badt_dhs",
    payload:
      '{"bant": "0", "maba": "007428", "mabn": "2023043313", "makb": "2502031399", "channel": "current.bnnoitru", "namvien": "1", "operation": "UPDATE", "changed_fields": {"madv": {"new": "23", "old": "24"}}, "notification_id": 7}',
    name: "notification",
  };
};
const templayPayloadObject = () => {
  return {
    bant: "0",
    maba: "007428",
    mabn: "2023043313",
    makb: "2502031399",
    channel: "current.bnnoitru",
    namvien: "1",
    operation: "UPDATE",
    changed_fields: { madv: { new: "23", old: "24" } },
    notification_id: 7,
  };
};

const notificationManager = (() => {
  // Đánh dấu thông báo đã xử lý
  async function markProcessed(notificationId) {
    try {
      // Cập nhật trường `processed` của bản ghi tương ứng với `notificationId`
      const query = `
      UPDATE ${configListener.pgListener.schema}.notifications
      SET   processed = 'True',  processed_at = NOW()
      WHERE id = $1
      RETURNING id, processed;
    `;
      return await pgClient.query(query, [notificationId]);
    } catch (error) {
      throw error;
    }
  }
  async function markRetry(notificationId) {
    try {
      const query = `
        UPDATE ${configListener.pgListener.schema}.${configListener.pgListener.table}
        SET   retry_count = COALESCE(retry_count, 0) + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `;
      return await pgClient.query(query, [notificationId]);
    } catch (error) {
      throw error;
    }
  }
  // 2. Hàm insert bản ghi vào bảng benhnhan_synced
  async function insertBenhNhanSynced(data) {
    const query = `
    INSERT INTO badt_dhs.benhnhan_synced (
      table_name, operation, payload, pathapi, resultapi,
      created_at, mabn, makb, maba, type
    )
    VALUES (
      $1, $2, $3::jsonb, $4, $5::jsonb,
      CURRENT_TIMESTAMP, $6, $7, $8, $9
    )
    RETURNING id;
  `;

    const values = [
      data.table_name,
      data.operation,
      JSON.stringify(data.payload),
      data.pathApi,
      JSON.stringify(data.resultApi),
      data.mabn,
      data.makb,
      data.maba,
      data.type,
    ];

    try {
      return await pgClient.query(query, values);
    } catch (err) {
      winstonLogger.logError(err, "insertBenhNhanSynced");
    }
  }
  return {
    markProcessed,
    markRetry,
    insertBenhNhanSynced,
  };
})();

const getPgData = async (payload, pgFunctionName = "") => {
  try {
    const tableName = payload["channel"];
    if (!(tableName in configListener.pgTableListener)) throw new Error(`Không tìm thấy bảng ${tableName} trong cấu hình Listener.`);

    const sqlBuilder = (() => {
      let { name, para = [] } = configListener.pgTableListener[tableName];
      if (pgFunctionName !== "") {
        ({ name, para =[] } = configListener.configFunction[pgFunctionName]);
      }
      const resolvePayloadItemValue = (item) => {
        let payloadItemValue = payload[item];

        //Chuyển đổi các cột giá trị dựa vào bảng, chủ yếu xảy ra ở pshdxn và chungtu, cơ bản qui ước các thông tin
        //bệnh án sẽ có cặp mabn,makb,maba ở các funtion gọi lấy dữ liệu
        if (tableName === "current.chungtu") {
          //SELECT badt_dhs.getCUTPPrescription(mabn, maba, makb, sohd);
          let chungtu_maba = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "maba");
          let noitru = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "noitru") === "1" ? "1" : "0";
          let bant = "0";
          if (noitru === "0") bant = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "bant") === "1" ? "1" : "0";

          if (noitru === "0" && bant === "0" && chungtu_maba === "") {
            //NGoại trú - Khám bệnh (xử lý trước, chưa dùng)
            if (item === "makb") payloadItemValue = payload["makh"];
            if (item === "maba") payloadItemValue = "";
          } else {
            let keyMa = `${tableName}.${noitru}.${bant}.${item}`;
            const pgTableMaps = {
              //Nội trú
              "current.chungtu.1.0.makb": "",
              "current.chungtu.1.0.maba": "makh",
              //BANT thanh toán đợt (bant=0)
              "current.chungtu.0.0.makb": "",
              "current.chungtu.0.0.maba": "makh",
              //BANT thanh toán ngày (bant=1)
              "current.chungtu.0.1.makb": "makh",
              "current.chungtu.0.1.maba": "maba",
              //NGoại trú - Khám bệnh
            };
            if (keyMa in pgTableMaps) payloadItemValue = payload[pgTableMaps[keyMa]];
          }
        }

        //Xử lý đảm bảo truyền rỗng khi null hoặc undefined
        if (typeof payloadItemValue === "undefined" || payloadItemValue === null) {
          payloadItemValue = "";
        }
        return payloadItemValue;
      };
      let paraValues = para.map((item) => `'${resolvePayloadItemValue(item)}'`);
      let sql = `SELECT ${name}(${paraValues.join(",")})`;
      winstonLogger.logInfoObject({ para, payload, sql, paraValues }, `chungtu.bant`);
      console.log("🚀 ~ sqlBuilder ~ sql:", sql);
      return sql;
    })();
    let row0 = await pgClient.query(sqlBuilder).then((res) => res.rows[0]);
    return JSON.parse(row0[Object.keys(row0)[0]]);
  } catch (error) {
    throw error;
  }
};

const CUSTOM_PATH = {
  SyncADM: { pathApi: "server/his-server/api/SyncData/SyncADM", pgFunctionName: "badt_dhs.getSyncADM" },
  SyncADM_ByDmbenhnhan: { pgFunctionName: "badt_dhs.getSyncADM" },
};

const queueNotification = (msg) => {
  try {
    const directHandled = (() => {
      try {
        const payload = JSON.parse(msg.payload);
        const tableName = payload["channel"];
        if (tableName === "current.bnnoitru") return true;
        if (tableName === "current.psdangky") return true;
        //Cập nhật để gửi, đảm bảo Tờ điều trị đi trước CLS
        if (tableName === "current.qtdieutri") return true;
        if (tableName === "current.chidinhcls") return true;
      } catch (error) {
        winstonLogger.logError(error, `directHandled`);
      }
      return false;
    })();
    if (directHandled === true) {
      handleNotification(msg);
    } else {
      queue.add(msg, handleNotification);
    }
  } catch (error) {
    throw error;
  }
};

const handleNotification = async (msg) => {
  const payload = JSON.parse(msg.payload);
  const tableName = payload["channel"];
  let { data, pathApi, pgFunctionName, method = "POST", mutiRequests = [] } = {};
  let { operation, bant, maba = "", mabn = "", makb = "", namvien, makh } = payload;
  let { EmployeeCode = "", ParaClinReqCode = "" } = {};
  let { isCancelHandleNotification = false, iddienbienByAPIEmr = false } = {};
  let apiResult;
  try {
    if (tableName === "current.dmbenhnhan") {
      await pgClient.query(` SELECT badt_dhs.getSyncADM_ByDmbenhnhan('${mabn}'); `);
      await notificationManager.markProcessed(payload.notification_id);
      return;
    }
    const setDefaultPathAPI = () => {
      if (!(tableName in dhsPathApi)) throw new Error(`Không tìm thấy bảng '${tableName}' trong cấu hình dhsPathApi.`);
      pathApi = dhsPathApi[tableName];
    };
    const checkIdDienbienFromPayloadByEMR = async () => {
      let iddienbien = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "iddienbien");
      try {
        // Kiểm tra input
        if (!iddienbien || iddienbien.trim() === "") return false;
        // Sử dụng EXISTS để kiểm tra sự tồn tại
        const query = `
          SELECT EXISTS(
            SELECT 1 
            FROM current.qtdieutri 
            WHERE iddienbien = $1 
            AND COALESCE(api, 0) = 1
          ) AS exists
        `;
        // Sử dụng parameterized query để tránh SQL injection
        const result = await pgClient.query(query, [iddienbien]);
        const resultBool = result.rows[0]?.exists || false;
        return resultBool;
      } catch (error) {
        winstonLogger.logError(error, "Error checking iddienbien by EMR:");
        throw error;
      }
    };
    const get_bnnoitru_ravien = async () => {
      try {
        if (mabn === "") return "0";
        if (makb === "") return "0";
        if (maba === "") return "0";
        const query = ` SELECT COALESCE(ravien,0) AS ravien FROM current.bnnoitru
          WHERE mabn = $1 AND makb = $2 AND maba = $3
        `;
        // Sử dụng parameterized query để tránh SQL injection
        const result = await pgClient.query(query, [mabn, makb, maba]);
        return result.rows[0]?.ravien || "0";
      } catch (error) {
        winstonLogger.logError(error, "Error checking ravien by get_bnnoitru_ravien");
        throw error;
      }
    };

    switch (tableName) {
      case "current.bnnoitru":
        pathApi = CUSTOM_PATH.SyncADM.pathApi;
        pgFunctionName = CUSTOM_PATH.SyncADM.pgFunctionName;
        switch (operation) {
          case "UPDATE":
            const isSyncDCHG = (() => {
              var ravienNew = Number(objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.ravien.new"));
              if (ravienNew !== 0) return true;
              let ngayrvNew = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.ngayrv.new");
              try {
                if (ngayrvNew !== "" && ngayrvNew.length > 0) return true;
              } catch { }
              return false;
            })();
            if (isSyncDCHG === true) {
              pathApi = "server/his-server/api/SyncData/SyncDCHG";
              pgFunctionName = "badt_dhs.getSyncDCHG";
              break;
            }
            let ravien = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "ravien") + "";
            if (ravien !== "0" && !payload?.changed_fields?.ravien) {
              isCancelHandleNotification = true;
              break;
            }
            let madv = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.madv.new") + "";
            if (madv !== "") {
              pathApi = "server/his-server/api/SyncData/SyncPATFR";
              pgFunctionName = "badt_dhs.getSyncPATFR";
              break;
            }
        }
        break;
      case "current.chidinhcls":
        if ((await checkIdDienbienFromPayloadByEMR()) === true) {
          isCancelHandleNotification = true;
          await notificationManager.markProcessed(payload.notification_id);
          return;
        }
        setDefaultPathAPI();
        let payloadPathApi = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "senddata.pathApi");
        EmployeeCode = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "senddata.EmployeeCode");
        ParaClinReqCode = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "senddata.ParaClinReqCode");
        if (typeof payloadPathApi === "string" && payloadPathApi !== "") pathApi = payloadPathApi;
        if (operation === "UPDATE") {
          var xoaNEW = Number(objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.xoa.new"));
          if (xoaNEW === 1) {
            let ParaClinReqCode = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "senddata.ParaClinReqCode");
            let PCReqDltVoucherNo = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "senddata.ParaClinRequests.0.PCReqDltVoucherNo");
            pathApi = `server/his-server/api/Connect/DTPParaClinReqDtl?ParaClinReqCode=${ParaClinReqCode}&PCReqDltVoucherNo=${PCReqDltVoucherNo}`;
            method = "DELETE";
            if (typeof payloadPathApi === "string" && payloadPathApi !== "") {
              pathApi = `server/his-server/api/Connect/DTPParaClinRequestOUT?ParaClinReqCode=${ParaClinReqCode}&PCReqDltVoucherNo=${PCReqDltVoucherNo}`;
            }
            winstonLogger.logInfo(`current.chidinhcls.xoaNEW === 1:${JSON.stringify({ pathApi, method, payloadPathApi })}`);
          }
        }
        break;
      case "current.chungtu":
        maba = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "makh");
        // HIS cho phép người dùng kê VTYT, nhưng không gửi cho EMR
        // => Chỗ này bên HIS xử lý chung lại luôn nhé @DH.BADT.DHS.Đông Quân , tất cả toa Vật tư, sẽ không gửi lên EMR nữa (thuộc y lệnh từ EMR hoặc y lệnh từ HIS)
        // ![](https://live.staticflickr.com/65535/54680007235_098dec16a3_b.jpg)
        let loaitoa = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "loaitoa");
        let tenkhbl = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "tenkhbl"); //Đây là toa TVT trong nội trú
        let kyhieu = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "kyhieu"); //Đây là toa TVT ngoại trú
        if (tenkhbl === "TVT" || kyhieu === "TVT") {
          isCancelHandleNotification = true;
          await notificationManager.markProcessed(payload.notification_id);
          return;
        }
        if ((await checkIdDienbienFromPayloadByEMR()) === true) {
          isCancelHandleNotification = true;
          await notificationManager.markProcessed(payload.notification_id);
          return;
        }
        setDefaultPathAPI();
        if (operation === "UPDATE") {
          var xoaNEW = Number(objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.xoa.new"));
          let { pshxhdXoaRows, sql } = {};
          if (xoaNEW === 1) {
            // /api/Connect/DTPPrescriptionDtl?PresCode=P25250421-0001&PresDtlCode=P25250421-0001-01
            // "sohd":"DH2.X25.0625.110620",
            let sohd = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "sohd");
            pathApi = `server/his-server/api/Connect/DTPPrescription?PresCode=${sohd}`;
            method = "DELETE";
          }
          winstonLogger.logInfo(`current.chungtu.xoaNEW === 1:${JSON.stringify({ mutiRequests, pshxhdXoaRows, sql, pathApi, method })}`);
        }
        break;
      case "current.psdangky":
        setDefaultPathAPI();
        if (operation === "UPDATE") {
          var ngayinphieuNEW = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.ngayinphieu.new");
          var ngayinphieuOLD = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.ngayinphieu.old");
          var madv_inphieuNEW = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "changed_fields.madv_inphieu.new");
          maba = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "maba");
          bant = objectHelpers.getPropertyValueIgnoreCaseForceEmpty(payload, "bant");
          // Kiểm tra chuyển đổi từ null/empty sang có giá trị ngày hợp lệ
          if (madv_inphieuNEW !== "" || ((!ngayinphieuOLD || ngayinphieuOLD === null) && ngayinphieuNEW && !isNaN(Date.parse(ngayinphieuNEW)))) {
            pathApi = "server/his-server/api/SyncData/SyncDCHG";
            pgFunctionName = "badt_dhs.getSyncDCHG_Ngoai_Khambenh";
          } else {
            //Thẻ BHYT ngoại trú
            const hasChangedTheBHYTFields = (() => {
              return (
                payload?.changed_fields && ["mathe", "ngaybd", "mabvdk", "ngaykt"].some((column) => payload.changed_fields[column]?.new !== undefined)
              );
            })();
            //Thông tin đăng ký khám bệnh
            const hasChangedThongtinDangky = (() => {
              return payload?.changed_fields && ["ngaydk", "maphong"].some((column) => payload.changed_fields[column]?.new !== undefined);
            })();
            //Thông tin nhập viện
            const hasChangedThongtinNhapvien = (() => {
              return (
                payload?.changed_fields &&
                ["loaiqh", "hotenqh", "cmndqh", "diachiqh", "dienthoaiqh"].some((column) => payload.changed_fields[column]?.new !== undefined)
              );
            })();

            const isNoiTru = maba !== "" && bant !== '1';
            if (hasChangedThongtinNhapvien === true || isNoiTru) {
              pathApi = CUSTOM_PATH.SyncADM.pathApi;
              pgFunctionName = "badt_dhs.getSyncADM";
              //Kiểm tra nếu hồ sơ đã ra viện rồi, thì không gọi hàm này: badt_dhs.getSyncADM.
              if ((await get_bnnoitru_ravien()) !== "0") {
                isCancelHandleNotification = true;
              }
            } else if (hasChangedTheBHYTFields === true || hasChangedThongtinDangky === true) {
              pathApi = CUSTOM_PATH.SyncADM.pathApi;
              pgFunctionName = "badt_dhs.getSyncADM_Ngoai";
            } else {
              winstonLogger.logInfo("Chạy vào else");
              isCancelHandleNotification = true;
            }
          }
          winstonLogger.logInfoObject(
            { madv_inphieuNEW, ngayinphieuNEW, ngayinphieuOLD, pathApi, method, isCancelHandleNotification, pgFunctionName },
            `current.psdangky.${operation}`,
          );
        }
        break;
      default:
        setDefaultPathAPI();
        break;
    }
    if (isCancelHandleNotification === true) {
      await notificationManager.markProcessed(payload.notification_id);
      return;
    }

    const isExecuteMuliRequest = mutiRequests && mutiRequests.length > 0;
    if (isExecuteMuliRequest === true) {
      data = mutiRequests;
    } else if ("senddata" in payload) {
      data = payload["senddata"];
    } else {
      data = await getPgData(payload, pgFunctionName);
    }

    if (isCancelHandleNotification === true) {
      await notificationManager.markProcessed(payload.notification_id);
      return;
    }

    const ReTry = (() => {
      const SyncADM = async () => {
        try {
          let dataSyncADM; //Xử lý thêm, đưa thông tin bệnh nhân trước.
          if ((pathApi + "").includes("CUTPParaClinRequestOUT")) {
            dataSyncADM = await getPgData(payload, `badt_dhs.getSyncADM_Ngoai`);
          } else {
            dataSyncADM = await getPgData(payload, CUSTOM_PATH.SyncADM.pgFunctionName);
          }

          if (!dataSyncADM || dataSyncADM === "null" || (typeof dataSyncADM === "object" && Object.keys(dataSyncADM).length === 0)) {
            await notificationManager.markRetry(payload.notification_id);
            winstonLogger.logError("dataSyncADM null", `dataSyncADM`);
          }
          let apiResultSyncADM = await dhs.sendData({ pathApi: CUSTOM_PATH.SyncADM.pathApi, data: dataSyncADM });
          if (dhs.ResOK(apiResultSyncADM)) {
            apiResult = await dhs.sendData({ method, data, pathApi });
          }
          winstonLogger.logInfoObject({ apiResult, dataSyncADM, apiResultSyncADM }, "Retry: Không tìm thấy người bệnh");
        } catch (error) {
          winstonLogger.logError(error, `ERROR_ReTry_SyncADM`);
        }
      };
      const SaveTPParaClinRequestOUT = async () => {
        try {
          apiResult["dataSaveTPParaClinRequestOUT"] = {
            ParaClinReqCode: ParaClinReqCode,
            EmpCode: EmployeeCode,
          };
          apiResult["methodSaveTPParaClinRequestOUT"] = "POST";
          apiResult["apiResultSaveTPParaClinRequestOUT"] = await dhs.sendData({
            method: apiResult["methodSaveTPParaClinRequestOUT"],
            data: apiResult["dataSaveTPParaClinRequestOUT"],
            pathApi: `server/his-server/api/Connect/SaveTPParaClinRequestOUT`,
          });
        } catch (error) {
          throw error;
        }
      };
      return {
        SyncADM,
        SaveTPParaClinRequestOUT,
      };
    })();

    try {
      if (isExecuteMuliRequest === true) {
        apiResult = [];
        for (let i = 0; i < mutiRequests.length; i++) {
          try {
            apiResult.push(await dhs.sendData(mutiRequests[i]));
          } catch (error) {
            winstonLogger.logError(error, `mutiRequests`);
            if (error?.response?.data) apiResult.push(error.response.data);
            else apiResult.push(error.message);
          }
        }
      } else {
        apiResult = await dhs.sendData({ method, data, pathApi });
        if ((pathApi + "").includes("CUTPParaClinRequestOUT") || (pathApi + "").includes("DTPParaClinRequestOUT")) {
          await ReTry.SaveTPParaClinRequestOUT();
        }
      }
    } catch (error) {
      if (error?.response?.data) apiResult = error.response.data;
      await notificationManager.markRetry(payload.notification_id);
    } finally {
    }

    if (apiResult === "Không tìm thấy người bệnh" || apiResult === "Không tìm thấy thông tin người bệnh") {
      await ReTry.SyncADM();
      apiResult = await dhs.sendData({ data, pathApi });
    }
    if (dhs.ResOK(apiResult) === true) {
      await notificationManager.markProcessed(payload.notification_id);
    } else {
      await notificationManager.markRetry(payload.notification_id);
    }
    if ((apiResult + "").includes("DOCTYPE html")) {
      apiResult = `ERROR:HTML`;
    }
    winstonLogger.logInfoObject({ apiResult, data, pathApi, payload, msg, isCancelHandleNotification });
  } catch (error) {
    winstonLogger.logError(error, "handleNotification");
  } finally {
    if (isCancelHandleNotification !== true) {
      let benhnhan_syncedData = {
        table_name: tableName,
        operation,
        payload: { ...data, extra: payload },
        pathApi,
        resultApi: apiResult,
        maba,
        mabn,
        makb,
        type: "HISEMR",
      };
      notificationManager.insertBenhNhanSynced(benhnhan_syncedData);
    }
  }
};

let IsprocessUnprocessedRunning = false;
const processUnprocessedNotifications = async (MAX_RETRY_COUNT) => {
  try {
    MAX_RETRY_COUNT = MAX_RETRY_COUNT || 5;
    if (IsprocessUnprocessedRunning === true) return;
    IsprocessUnprocessedRunning = true;
    winstonLogger.logInfo(`Checking for unprocessed notifications...[MAX_RETRY_COUNT:${MAX_RETRY_COUNT}]`);
    const query = `
      SELECT    payload, table_name, id 
      FROM      badt_dhs.notifications 
      WHERE     COALESCE(processed, false) = false 
            AND retry_count <= $1 
            AND created_at >= NOW() - INTERVAL '1 day'
      ORDER BY  created_at ASC 
      LIMIT 200;
    `;
    const result = await pgPool.query(query, [MAX_RETRY_COUNT]);
    winstonLogger.logInfoObject({ "rows.length": result?.rows?.length }, `processUnprocessedNotifications`);
    if (typeof result === "undefined" || result === null || result?.rows?.length === 0) {
      winstonLogger.logInfo("No unprocessed notifications found.");
      IsprocessUnprocessedRunning = false;
      return;
    }
    for (const notification of result.rows) {
      try {
        const payload = notification.payload;
        payload.channel = notification.table_name;
        payload.notification_id = notification.id;
        await handleNotification({ payload: JSON.stringify(payload) });
      } catch (error) {
        winstonLogger.logError(error, `Error - For handleNotification`);
      }
    }
  } catch (error) {
    winstonLogger.logError(error);
  } finally {
    IsprocessUnprocessedRunning = false;
  }
};
const getDirSynData = (name = "syncAllDanhMuc") => {
  let saveDirPath = `E:/CLOUDCODE/dh-hos-code/dh-javascript-sources/src/EMR-DHS-PG/.gitignore/sync-omon`;
  if (fs.existsSync(saveDirPath) !== true) {
    saveDirPath = path.join(process.cwd(), name);
    winstonLogger.logInfo(`Đang tạo thư mục ${name}: ${saveDirPath}`);
    if (fs.existsSync(saveDirPath) !== true) fs.mkdirSync(saveDirPath, { recursive: true });
  }
  return saveDirPath;
};
const syncAllDanhMuc = async (syncTable = "") => {
  try {
    let pgTables = [
      "current.dmdonvi",
      "current.dmnhanvien",
      "current.dmphong",
      "current.dmgiuongbenh",
      "current.dmloaicls",
      "current.dmcls",
      "current.dmkhocp",
      "current.dmkhoql",
      "current.dmthuoc",
      "current.dmxa4750-tinh",
      "current.dmxa4750-huyen",
      "current.dmxa4750-xa",
      "current.dmdantoc",
      "current.dmnghe",
      "current.dmicd",
    ];
    if (syncTable && syncTable.trim() && syncTable !== "") {
      const needle = syncTable.trim().toLowerCase();
      pgTables = pgTables.filter((t) => t.toLowerCase().includes(needle));
      if (pgTables.length === 0) {
        throw new Error(`Không tìm thấy bảng nào chứa '${syncTable}' trong danh sách.`);
      }
    }
    let status = {};
    let saveDirPath = getDirSynData(`syncAllDanhMuc`);
    for (let i = 0; i < pgTables.length; i++) {
      let table = pgTables[i];
      winstonLogger.logInfo(`➡️ Sync danh mục: ${table}`);
      let { functionName = "", pathApi = "" } = {};
      const xacdinhPathFunc = (() => {
        if (table === "current.dmxa4750-tinh") {
          functionName = "badt_dhs.GetSyncCityProvince";
          pathApi = `server/his-server/api/SyncData/SyncCityProvince`;
          return;
        }
        if (table === "current.dmxa4750-huyen") {
          functionName = "badt_dhs.GetSyncDistrict";
          pathApi = `server/his-server/api/SyncData/SyncDistrict`;
          return;
        }
        if (table === "current.dmxa4750-xa") {
          functionName = "badt_dhs.GetSyncWard";
          pathApi = `server/his-server/api/SyncData/SyncWard`;
          return;
        }
        functionName = configListener.pgTableListener[table].name;
        pathApi = dhsPathApi[table];
      })();

      let apiResult, pgData;

      let saveFile = path.join(saveDirPath, `${table}.success.json`);
      function chunkArray(array, size) {
        // Kiểm tra input hợp lệ
        if (!Array.isArray(array)) {
          throw new Error("Tham số đầu tiên phải là một array");
        }

        if (!Number.isInteger(size) || size <= 0) {
          throw new Error("Size phải là số nguyên dương");
        }

        const chunks = [];

        // Chia array thành các chunk
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }

        return chunks;
      }
      try {
        if (fs.existsSync(saveFile) !== true || pgTables.length === 1) {
          winstonLogger.logInfo(`➡️ GetData: ${table}`);
          pgData = await pgClient.query(`SELECT ${functionName}();`).then((res) => {
            let row0 = res.rows[0];
            return JSON.parse(row0[Object.keys(row0)[0]]);
          });
          // Dùng JSON.stringify để so sánh tất cả các thuộc tính
          pgData = pgData.filter((value, index, self) => index === self.findIndex((t) => JSON.stringify(t) === JSON.stringify(value)));
          fs.writeFileSync(path.join(saveDirPath, `${table}.rawdata.json`), JSON.stringify(pgData, null, 2));
          winstonLogger.logInfo(`➡️ SendData: ${table}`);

          let SYNCDATA_ITEM = parseInt(process.env["SYNCDATA_ITEM"], 10) || 2000;
          if (SYNCDATA_ITEM <= 0) SYNCDATA_ITEM = 2000;

          let chunks = chunkArray(pgData, SYNCDATA_ITEM);
          if (chunks.length === 1) {
            apiResult = await dhs.sendData({ pathApi, data: pgData });
          } else {
            apiResult = {
              Data: "success",
              Message: null,
              Result: 0,
              ErrorCode: 0,
              apiResults: [],
              chunks: chunks,
            };
            for (let i = 0; i < chunks.length; i++) {
              winstonLogger.logInfo(`➡️ SendData (chunks: ${SYNCDATA_ITEM}) [${i + 1}/${chunks.length}]: ${table}`);
              let apiResultItem = await dhs.sendData({ pathApi, data: chunks[i] });
              apiResult.apiResults.push(apiResultItem);
              if (dhs.ResOK(apiResultItem) !== true) {
                throw apiResult;
              }
            }
          }

          if (dhs.ResOK(apiResult) === true) {
            status[table] = `✅ Sync thành công:${table} ${pathApi}`;
            fs.writeFileSync(saveFile, JSON.stringify({ apiResult, pathApi, pgData }, null, 2));
          } else {
            throw apiResult;
          }
        } else {
          status[table] = `✅ Synced thành công:${table} ${pathApi}`;
        }
      } catch (error) {
        if (error?.response?.data) apiResult = error.response.data;
        else apiResult = error;
        status[table] = `⛔ Sync thất bại:${table} ${pathApi} ${error}`;
        saveFile = path.join(saveDirPath, `${table}.fail.json`);
        fs.writeFileSync(saveFile, JSON.stringify({ apiResult, pathApi, pgData, error: objectHelpers.stringifyForceEmpty(error) }, null, 2));
      } finally {
        winstonLogger.logInfo(status[table]);
      }
    }
    winstonLogger.logInfoObject(status, `syncAllDanhMuc`);
  } catch (error) {
    throw error;
  }
};
const syncBnnoitru = async () => {
  let {
    pathApi = CUSTOM_PATH.SyncADM.pathApi,
    pgFunctionName = CUSTOM_PATH.SyncADM.pgFunctionName,
    pgData,
    status = {
      total: 0,
      success: 0,
      fail: 0,
      dsFails: [],
    },
    err,
  } = {};
  let saveDirPath = getDirSynData(`syncBnnoitru`);
  try {
    winstonLogger.logInfo(`➡️ GetPgData: Bnnoitru`);
    const getData = await (async () => {
      const songaylui = await (async () => {
        const SO_NGAY_LUI = 90;
        try {
          return await pgClient.query(`SELECT COALESCE(giatri,'60') AS giatri FROM current.system WHERE tents='nt.songaylui'`).then((result) => {
            return Number(result.rows[0]["giatri"] || 90) || SO_NGAY_LUI;
          });
        } catch (error) {
          winstonLogger.logError(error, "songaylui");
          return SO_NGAY_LUI;
        }
      })();
      let sql = ``;
      sql += ` SELECT DISTINCT mabn, makb, maba `;
      sql += ` FROM current.bnnoitru `;
      sql += ` WHERE xoa = 0 `;
      sql += `    AND COALESCE(ravien,0) = 0 `;
      sql += `    AND COALESCE(namvien,0) = 1 `;
      sql += `    AND ngayvv >= CURRENT_DATE - INTERVAL '${songaylui} days' `;
      sql += ` ORDER BY mabn, makb, maba `;
      pgData = await pgClient.query(sql).then((result) => result.rows);
      winstonLogger.logInfoObject({ countRow: pgData.length, songaylui, sql }, "syncBnnoitru-getData");
      status.total = pgData.length;
      if (pgData.length > 0) {
        for (let i = 0; i < pgData.length; i++) {
          let { mabn, makb, maba } = pgData[i];
          let fileName = `${mabn}-${makb}-${maba}`;
          let pathFileSuccess = path.join(saveDirPath, `${fileName}.success.json`);
          winstonLogger.logInfo(`➡️ SyncData: Bnnoitru [${i + 1}/${pgData.length}]:${fileName}`);
          if (fs.existsSync(pathFileSuccess) === true) continue;

          pgData[i] = await pgClient.query(`SELECT ${pgFunctionName}('${mabn}','${maba}','${makb}');`).then((res) => {
            let row0 = res.rows[0];
            return JSON.parse(row0[Object.keys(row0)[0]]);
          });

          let apiResult;
          try {
            apiResult = await dhs.sendData({ pathApi, data: pgData[i] });
          } catch (error) {
            if (error?.response?.data) apiResult = error.response.data;
            else apiResult = error;
          }
          if (dhs.ResOK(apiResult) === true) {
            status.success++;
            fs.writeFileSync(pathFileSuccess, JSON.stringify({ apiResult, pgData: pgData[i] }, null, 2));
          } else {
            status.fail++;
            status.dsFails.push({ data: pgData[i], apiResult });
          }
        }
      }
    })();
  } catch (error) {
    err = error;
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(saveDirPath, "bnnoitru.json"),
      JSON.stringify({ status, pgData, error: objectHelpers.stringifyForceEmpty(err), pathApi, pgFunctionName }, null, 2),
    );
    winstonLogger.logInfoObject(status, `🔚 Sync Bnnoitru 🔚`);
  }
};
const psdangkySyncDCHG = async () => {
  let {
    pathApi = `server/his-server/api/SyncData/SyncDCHG`,
    pgFunctionName = `badt_dhs.getSyncDCHG_Ngoai_Khambenh`,
    pgData,
    status = {
      NGAYDK: "",
      total: 0,
      success: 0,
      fail: 0,
      dsFails: [],
    },
    err,
  } = {};
  let saveDirPath = getDirSynData(`psdangkySyncDCHG`);
  try {
    winstonLogger.logInfo(`➡️ GetPgData: psdangkySyncDCHG`);
    status.NGAYDK = await (async () => {
      try {
        let SYSDATE = ` SELECT TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD') AS sysdate `;
        let PREVIOUS_DATE = ` SELECT TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '1 day', 'YYYY-MM-DD') AS sysdate `;
        return await pgClient.query(PREVIOUS_DATE).then((result) => {
          return result.rows[0]["sysdate"] || "";
        });
      } catch (error) {
        winstonLogger.logError(error, "NGAYDK");
        return "";
      }
    })();
    const getData = await (async () => {
      let sql = ``;
      sql += ` SELECT DISTINCT dk.mabn, dk.makb `;
      sql += ` FROM current.psdangky AS dk `;
      sql += ` WHERE 0 = 0 `;
      sql += `  AND TO_CHAR(dk.ngaydk, 'YYYY-MM-DD') = '${status.NGAYDK}' `;
      sql += `  AND dk.ngayinphieu IS NULL `;
      sql += `  AND COALESCE(dk.tinhtrang,0)=0 `;
      sql += ` ORDER BY dk.mabn, dk.makb `;
      pgData = await pgClient.query(sql).then((result) => result.rows);
      winstonLogger.logInfoObject({ countRow: pgData.length, ngaydk: status.NGAYDK, sql }, "psdangkySyncDCHG-getData");
      status.total = pgData.length;
      if (pgData.length > 0) {
        for (let i = 0; i < pgData.length; i++) {
          let { mabn, makb } = pgData[i];
          let fileName = `${mabn}-${makb}`;
          winstonLogger.logInfo(`➡️ SyncData: psdangkySyncDCHG [${i + 1}/${pgData.length}]:${fileName}`);

          pgData[i] = await pgClient.query(`SELECT ${pgFunctionName}('${mabn}','${makb}');`).then((res) => {
            let row0 = res.rows[0];
            return JSON.parse(row0[Object.keys(row0)[0]]);
          });

          let apiResult;
          try {
            apiResult = await dhs.sendData({ pathApi, data: pgData[i] });
          } catch (error) {
            if (error?.response?.data) apiResult = error.response.data;
            else apiResult = error;
          }
          if (dhs.ResOK(apiResult) === true) {
            status.success++;
          } else {
            status.fail++;
            status.dsFails.push({ data: pgData[i], apiResult });
          }
        }
      }
    })();
  } catch (error) {
    err = error;
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(saveDirPath, `psdangkySyncDCHG-${status.NGAYDK}.json`),
      JSON.stringify({ status, pgData, error: objectHelpers.stringifyForceEmpty(err), pathApi, pgFunctionName }, null, 2),
    );
    winstonLogger.logInfoObject(status, `🔚 Sync psdangkySyncDCHG 🔚`);
  }
};
const checkHosoEMR = async () => {
  let {
    status = {
      songaylui: 0,
      dsDonvi: [],
      dsHIS: [],
    },
    err,
  } = {};
  let saveDirPath = getDirSynData(`checkHosoEMR`);
  try {
    winstonLogger.logInfo(`➡️ GetPgData: checkHosoEMR`);
    status.dsDonvi = await (async () => {
      try {
        let sql = ``;
        sql += ` SELECT madv,tendv FROM current.dmdonvi `;
        sql += ` WHERE COALESCE(loaidv,0)=1 AND COALESCE(dieutri,'0')='1' `;
        return await pgClient.query(sql).then((result) => result.rows || []);
      } catch (error) {
        throw error;
      }
    })();
    status.songaylui = await (async () => {
      const SO_NGAY_LUI = 90;
      try {
        return await pgClient.query(`SELECT COALESCE(giatri,'60') AS giatri FROM current.system WHERE tents='nt.songaylui'`).then((result) => {
          return Number(result.rows[0]["giatri"] || 90) || SO_NGAY_LUI;
        });
      } catch (error) {
        winstonLogger.logError(error, "songaylui");
        return SO_NGAY_LUI;
      }
    })();
    if (typeValidators.isArrayNonEmpty(status.dsDonvi) !== true) return;
    for (let i = 0; i < status.dsDonvi.length; i++) {
      let { madv, tendv } = status.dsDonvi[i];
      status[madv] = status[madv] || {
        countEMR: 0,
        countHIS: 0,
        countRavienEMR: 0,
        countRavienEMRSuccess: 0,
        countRavienEMRFail: 0,
      };
      status[madv]["dsEMR"] = await (async () => {
        try {
          let apiResult = await dhs.sendData({
            pathApi: `server/his-server/api/Connect/AdmissionInDept?DepartmentCode=${madv}`,
            method: "GET",
          });
          if (dhs.ResOK(apiResult) === true) {
            if (typeValidators.isArrayNonEmpty(apiResult.Data) === true) {
              apiResult.Data = apiResult.Data.map((x) => {
                return {
                  PatientName: x["PatientName"],
                  PatientCode: x["PatientCode"],
                  AdmissionCode: x["AdmissionCode"],
                  MedicalRecordNo: x["MedicalRecordNo"],
                  AdmissionDate: x["AdmissionDate"],
                  mabn: x["PatientCode"],
                  makb: x["AdmissionCode"],
                  maba: x["MedicalRecordNo"],
                };
              });
            }
            return apiResult.Data;
          }
          throw apiResult;
        } catch (error) {
          if (error?.response?.data) throw error.response.data;
          else throw error;
        }
      })();
      if (typeValidators.isArrayNonEmpty(status[madv]["dsEMR"]) !== true) continue;
      status[madv]["countEMR"] = status[madv]["dsEMR"].length;
      status[madv]["countHIS"] = await (async () => {
        try {
          let sql = ``;
          sql += ` SELECT DISTINCT nt.mabn, nt.makb, nt.maba, `;
          sql += `        COALESCE(nt.ravien,0) AS ravien `;
          sql += ` FROM current.bnnoitru AS nt `;
          sql += ` WHERE COALESCE(xoa,0) = 0 `;
          sql += `  AND COALESCE(ravien,0) = 0 `;
          sql += `  AND COALESCE(namvien,0) = 1 `;
          sql += `  AND ngayvv >= CURRENT_DATE - INTERVAL '${status.songaylui} days' `;
          sql += `  AND nt.madv = '${madv}' `;
          return await pgClient.query(sql).then((result) => result.rows.length);
        } catch (error) {
          throw error;
        }
      })();
      const checkHoSoRaVienHIS = await (async () => {
        for (let i = 0; i < status[madv]["dsEMR"].length; i++) {
          let { mabn, makb, maba, PatientName } = status[madv]["dsEMR"][i];
          winstonLogger.logInfo(`Xử lý [${madv}-${tendv}] [${i + 1}/${status[madv]["dsEMR"].length}]: ${maba} - ${PatientName} `);
          let sql = ``;
          sql += ` SELECT COALESCE(nt.ravien,0) AS ravien `;
          sql += ` FROM current.bnnoitru AS nt `;
          sql += ` WHERE COALESCE(xoa,0) = 0 `;
          sql += `  AND COALESCE(namvien,0) = 1 `;
          sql += `  AND mabn = '${mabn}' `;
          sql += `  AND makb = '${makb}' `;
          sql += `  AND maba = '${maba}' `;

          let ravien = await pgClient.query(sql).then((result) => result.rows[0]?.ravien ?? "");
          status[madv]["dsEMR"][i]["ravien"] = ravien;
          if (ravien !== "" && ravien !== "0") {
            status[madv]["countRavienEMR"] = parseInt(status[madv]["countRavienEMR"] || 0) + 1;
          }
          if (ravien !== "" && ravien !== "0") {
            //Gọi xuất viện trên EMR
            let { data, apiResult, pathApi = "server/his-server/api/SyncData/SyncDCHG" } = {};
            data = await pgClient
              .query(`SELECT badt_dhs.getSyncDCHG('${mabn}','${maba}','${makb}') AS data;`)
              .then((result) => result.rows[0]?.data ?? "");
            if (data !== "") data = JSON.parse(data);
            try {
              apiResult = await dhs.sendData({ pathApi, data });
            } catch (error) {
              if (error?.response?.data) apiResult = error.response.data;
              else apiResult = error;
            }
            if (dhs.ResOK(apiResult) === true) {
              status[madv]["dsEMR"][i]["apiResult"] = true;
              status[madv]["countRavienEMRSuccess"] = parseInt(status[madv]["countRavienEMRSuccess"] || 0) + 1;
            } else {
              status[madv]["dsEMR"][i]["apiResult"] = { data, apiResult, pathApi };
              status[madv]["countRavienEMRFail"] = parseInt(status[madv]["countRavienEMRFail"] || 0) + 1;
            }
          }
        }
      })();
      const checkHoSoHISMissing = await (async () => {
        // Cách 4: Sử dụng Array methods (hiệu quả hơn)
        function findPatientOptimized(MedicalRecordNo, AdmissionCode, PatientCode) {
          for (const [deptId, dept] of Object.entries(status)) {
            if (dept.dsEMR && Array.isArray(dept.dsEMR)) {
              const foundPatient = dept.dsEMR.find(
                (patient) =>
                  patient.MedicalRecordNo === MedicalRecordNo && patient.AdmissionCode === AdmissionCode && patient.PatientCode === PatientCode,
              );
              if (foundPatient) return true;
            }
          }
          return false;
        }
        status.dsHIS = await (async () => {
          try {
            let sql = ``;
            sql += ` SELECT DISTINCT nt.mabn, nt.makb, nt.maba, nt.madv, `;
            sql += `        COALESCE(nt.ravien,0) AS ravien `;
            sql += ` FROM current.bnnoitru AS nt `;
            sql += ` WHERE COALESCE(xoa,0) = 0 `;
            sql += `  AND COALESCE(ravien,0) = 0 `;
            sql += `  AND COALESCE(namvien,0) = 1 `;
            sql += `  AND ngayvv >= CURRENT_DATE - INTERVAL '${status.songaylui} days' `;
            return await pgClient.query(sql).then((result) => result.rows);
          } catch (error) {
            throw error;
          }
        })();
        if (typeValidators.isArrayNonEmpty(status.dsHIS) !== true) return;
        for (let i = 0; i < status.dsHIS.length; i++) {
          let { mabn, makb, maba } = status.dsHIS[i];
          status.dsHIS[i]["existEMR"] = findPatientOptimized(maba, makb, mabn);
          if (status.dsHIS[i]["existEMR"] !== true) {
            status.dsHIS[i]["apiResult"] = await (async () => {
              //Gọi lại nhập viện trên EMR
              let { data, apiResult, pathApi = "server/his-server/api/SyncData/SyncADM" } = {};
              data = await pgClient
                .query(`SELECT badt_dhs.getSyncADM('${mabn}','${maba}','${makb}') AS data;`)
                .then((result) => result.rows[0]?.data ?? "");
              if (data !== "") data = JSON.parse(data);
              try {
                apiResult = await dhs.sendData({ pathApi, data });
                // apiResult = { data, pathApi };
              } catch (error) {
                if (error?.response?.data) apiResult = error.response.data;
                else apiResult = error;
              }
              return apiResult;
            })();
          }
        }
      })();
      //Check hồ sơ đã ra viện.
    }
    return;
    status.dsOnEMR = await (async () => { })();
    if (typeValidators.isArrayNonEmpty(status.dsOnEMR) === true) {
      status.total = status.dsOnEMR.length;
      //Check hồ sơ đã ra viện.
      for (let i = 0; i < status.dsOnEMR.length; i++) {
        let item = status.dsOnEMR[i];
        let { PatientCode: mabn, AdmissionCode: makb, MedicalRecordNo: maba } = item;
        let sql = ``;
        sql += ` SELECT COALESCE(nt.ravien,0) AS ravien `;
        sql += ` FROM current.bnnoitru AS nt `;
        sql += ` WHERE COALESCE(xoa,0) = 0 `;
        sql += `  AND COALESCE(namvien,0) = 1 `;
        sql += `  AND mabn = '${mabn}' `;
        sql += `  AND makb = '${makb}' `;
        sql += `  AND maba = '${maba}' `;
        let ravien = await pgClient.query(sql).then((result) => result.rows[0]?.ravien ?? "");
        if (ravien !== "" && ravien !== "0") {
          //Gọi xuất viện trên EMR
          let { data, apiResult, pathApi = "server/his-server/api/SyncData/SyncDCHG" } = {};
          data = await pgClient
            .query(`SELECT badt_dhs.getSyncDCHG('${mabn}','${maba}','${makb}') AS data;`)
            .then((result) => result.rows[0]?.data ?? "");
          if (data !== "") data = JSON.parse(data);
          try {
            apiResult = await dhs.sendData({ pathApi, data });
          } catch (error) {
            if (error?.response?.data) apiResult = error.response.data;
            else apiResult = error;
          }
          if (dhs.ResOK(apiResult) === true) {
            status.success++;
          } else {
            status.fail++;
            status.dsFails.push({ data, apiResult });
          }
          winstonLogger.logInfoObject({ mabn, makb, maba, ravien, data, apiResult }, `Gọi xuất viện`);
        }
      }
    }

    return;
    status.dsOnHIS = await (async () => {
      try {
        const songaylui = await (async () => {
          const SO_NGAY_LUI = 90;
          try {
            return await pgClient.query(`SELECT COALESCE(giatri,'60') AS giatri FROM current.system WHERE tents='nt.songaylui'`).then((result) => {
              return Number(result.rows[0]["giatri"] || 90) || SO_NGAY_LUI;
            });
          } catch (error) {
            winstonLogger.logError(error, "songaylui");
            return SO_NGAY_LUI;
          }
        })();
        let sql = ``;
        sql += ` SELECT DISTINCT nt.mabn, nt.makb, nt.maba, `;
        sql += `        COALESCE(nt.ravien,0) AS ravien `;
        sql += ` FROM current.bnnoitru AS nt `;
        sql += ` WHERE COALESCE(xoa,0) = 0 `;
        sql += `  AND COALESCE(ravien,0) = 0 `;
        sql += `  AND COALESCE(namvien,0) = 1 `;
        sql += `  AND ngayvv >= CURRENT_DATE - INTERVAL '${songaylui} days' `;
        sql += `  AND nt.madv = '${status.CHECK_HOSO_EMR_MADV}' `;
        return await pgClient.query(sql).then((result) => result.rows);
      } catch (error) {
        throw error;
      }
    })();
    const getData = await (async () => {
      let sql = ``;
      sql += ` SELECT DISTINCT dk.mabn, dk.makb `;
      sql += ` FROM current.psdangky AS dk `;
      sql += ` WHERE 0 = 0 `;
      sql += `  AND TO_CHAR(dk.ngaydk, 'YYYY-MM-DD') = '${status.NGAYDK}' `;
      sql += `  AND dk.ngayinphieu IS NULL `;
      sql += `  AND COALESCE(dk.tinhtrang,0)=0 `;
      sql += ` ORDER BY dk.mabn, dk.makb `;
      pgData = await pgClient.query(sql).then((result) => result.rows);
      winstonLogger.logInfoObject({ countRow: pgData.length, ngaydk: status.NGAYDK, sql }, "psdangkySyncDCHG-getData");
      status.total = pgData.length;
      if (pgData.length > 0) {
        for (let i = 0; i < pgData.length; i++) {
          let { mabn, makb } = pgData[i];
          let fileName = `${mabn}-${makb}`;
          winstonLogger.logInfo(`➡️ SyncData: psdangkySyncDCHG [${i + 1}/${pgData.length}]:${fileName}`);

          pgData[i] = await pgClient.query(`SELECT ${pgFunctionName}('${mabn}','${makb}');`).then((res) => {
            let row0 = res.rows[0];
            return JSON.parse(row0[Object.keys(row0)[0]]);
          });

          let apiResult;
          try {
            apiResult = await dhs.sendData({ pathApi, data: pgData[i] });
          } catch (error) {
            if (error?.response?.data) apiResult = error.response.data;
            else apiResult = error;
          }
          if (dhs.ResOK(apiResult) === true) {
            status.success++;
          } else {
            status.fail++;
            status.dsFails.push({ data: pgData[i], apiResult });
          }
        }
      }
    })();
  } catch (error) {
    err = error;
    throw error;
  } finally {
    fs.writeFileSync(path.join(saveDirPath, `checkHosoEMR.json`), JSON.stringify({ status, error: objectHelpers.stringifyForceEmpty(err) }, null, 2));
    winstonLogger.logInfoObject(status, `🔚 checkHosoEMR 🔚`);
  }
};

module.exports = {
  queueNotification,
  processUnprocessedNotifications,
  handleNotification,
  initializePgClient: (client) => (pgClient = client),
  initializePgPool: (pool) => (pgPool = pool),
  syncAllDanhMuc,
  syncBnnoitru,
  psdangkySyncDCHG,
  checkHosoEMR,
};
