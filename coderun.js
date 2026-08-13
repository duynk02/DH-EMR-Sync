const dotenvHelper = require("../../helpers/dotenvHelper");
const winstonLogger = require("../../helpers/winstonLogger");
const { Pool } = require("pg");
const dotEnvToCodeRun = async (codeRunKey = "badt") => {
  try {
    let envObject = dotenvHelper.getDotenvValues();
    const pool = new Pool({
      user: envObject.PGDATA_USER,
      host: envObject.PGDATA_HOST,
      database: envObject.PGDATA_DATABASE,
      password: envObject.PGDATA_PASSWORD,
      port: envObject.PGDATA_PORT || 5432,
    });
    var client = await pool.connect();

    const cleanUpPgPool = async () => {
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

    let rootKeys = (() => {
      let ROOT_OBJECT_ENV = envObject["ROOT_OBJECT_ENV"] || "";
      if (ROOT_OBJECT_ENV.length <= 0) return [];
      if (ROOT_OBJECT_ENV.includes(".")) return ROOT_OBJECT_ENV.split(".");
      return [ROOT_OBJECT_ENV];
    })();
    let pgData = await (async () => {
      try {
        const result = await client.query(`SELECT value FROM current.coderun WHERE code = $1`, [codeRunKey]);
        if (result.rows.length === 0) return {};
        try {
          return JSON.parse(result.rows[0].value);
        } catch (parseError) {
          winstonLogger.logError(parseError, "saveCodeRun.pgData.parseError");
          return {};
        }
      } catch (error) {
        winstonLogger.logError(error, "saveCodeRun.pgData");
        return {};
      }
    })();
    const existsChanged = await (async () => {
      try {
        let hasChanges = false;
        // Tạo nested structure theo rootKeys
        let targetObject = pgData;
        if (rootKeys.length > 0) {
          for (let i = 0; i < rootKeys.length; i++) {
            const key = rootKeys[i];
            if (!targetObject[key] || typeof targetObject[key] !== "object") {
              targetObject[key] = {};
              hasChanges = true;
            }
            targetObject = targetObject[key];
          }
        }
        // Duyệt envObject và add vào targetObject
        for (const [key, value] of Object.entries(envObject)) {
          if (targetObject[key] !== value) {
            targetObject[key] = value;
            hasChanges = true;
          }
        }
        return hasChanges;
      } catch (error) {
        winstonLogger.logError(error, "saveCodeRun.hasChanges");
      }
    })();
    const updateDB = await (async () => {
      try {
        if (existsChanged !== true) return false;
        // Sử dụng UPSERT
        const updatedValue = JSON.stringify(pgData);
        // Thử update trước
        const updateResult = await client.query("UPDATE current.coderun SET value = $1 WHERE code = $2", [updatedValue, codeRunKey]);
        // Nếu không có row nào được update thì insert
        if (updateResult.rowCount === 0) {
          await client.query("INSERT INTO current.coderun (code, value) VALUES ($1, $2)", [codeRunKey, updatedValue]);
        }
        return true;
      } catch (dbError) {
        winstonLogger.logError(dbError, "saveCodeRun.database.error");
      }
    })();
    // await pool.end();
    await cleanUpPgPool();
    winstonLogger.logInfoObjectSimple({ updateDB, existsChanged }, `saveCodeRun`);
  } catch (error) {
    winstonLogger.logError(error, "saveCodeRun");
  }
};
module.exports = { dotEnvToCodeRun };
