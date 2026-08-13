const fs = require("fs");
const path = require("path");
const expressHelper = require("../../modulers/expressHelper");
const winstonLogger = require("../../helpers/winstonLogger");
const {
  callPgFunction,
  executeQuery,
  insertReceivedData,
  dropAndCreateFunctions,
  dbHelper,
  getCSV,
  getLog,
  getSigns,
  buildWorksheetXML,
  buildWorkbookXML,
  getTableLog,
  extractImages,
  formatNgayChiDinh,
  getThamSo,
} = require("./pg-express/pgAPI");
const { EmrApiFunctions } = require("./pg-express/dhsAPI");
const queries = require("./pg-express/queries");
const objectHelpers = require("../../helpers/objectHelpers");
const dotenvHelper = require("../../helpers/dotenvHelper");
const coderun = require("./coderun");
const { exec } = require("child_process");
const crypto = require("crypto");
const signUtils = require("../../modulers/signUtils");

const MAX_RETRY_COUNT = parseInt(process.env.MAX_RETRY_COUNT || "5", 10); // Số lần thử lại tối đa

let OUT_DIR = null;
let HA_TAIKHOAN = null;
let SERVICE_HA_DIR = null;
//Cập nhật cấu trúc
const checkTable = async () => {
  try {
    // tạo thư mục chứa hình ảnh tại máy services
    const dir = path.join(process.cwd(), "HINHANH");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    SERVICE_HA_DIR = dir;

    if (OUT_DIR === null) {
      OUT_DIR = await getThamSo("folderimage");
      HA_TAIKHOAN = await getThamSo("ha.taikhoan");
    }
    //Cập nhật bảng
    // Hoặc với options:
    let resultCheckTable = await queries.runMigrations(executeQuery, {
      silent: true, // false = hiển thị log, true = chạy im lặng
      stopOnError: false, // false = tiếp tục khi lỗi, true = dừng ngay khi lỗi
    });
    winstonLogger.logInfo(`resultCheckTable:::${JSON.stringify(resultCheckTable, null, 2)}`);
    // await executeQuery(queries.createTable, []);
    //Cập nhật function
    await dropAndCreateFunctions(EmrApiFunctions);
    await coderun.dotEnvToCodeRun(process.env["CODE_RUN_KEY"] || "badt");
  } catch (error) {
    winstonLogger.logError(error, `Error Express checkTable`);
  }
};
const Operation = {
  INSERT: "INSERT",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
};
const ROOT_PATH = `/api/badt:mabv`;

// 2. Hàm insert bản ghi vào bảng benhnhan_synced
async function insertBenhNhanSynced(req, result, functionName) {
  try {
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
    //NT.makb AS AdmissionCode, --Mã tiếp nhận
    //NT.mabn as PatientCode, --Mã bệnh nhân
    //NT.maba AS MedicalRecordNo, --Số bệnh án

    // Kiểm tra xem có body không và body không rỗng
    let reqBody = {};
    if (req.body && Object.keys(req.body).length > 0) {
      reqBody = req.body;
    } else {
      reqBody = { ...req.query, ...req.params };
    }

    const values = [
      "", // table_name
      functionName, //operation
      JSON.stringify(reqBody), //payload
      req.path, //pathapi
      JSON.stringify(result), //resultapi
      objectHelpers.getPropertyValueIgnoreCaseNonEmptyFirst(reqBody, "PatientCode"), //data.mabn, //mabn
      objectHelpers.getPropertyValueIgnoreCaseNonEmptyFirst(reqBody, "AdmissionCode"), // data.makb, //makb
      objectHelpers.getPropertyValueIgnoreCaseNonEmptyFirst(reqBody, "MedicalRecordNo"), // data.maba, //maba
      "EMRHIS", //Type
    ];
    winstonLogger.logInfoObject({ query, values }, "insertBenhNhanSynced");
    return await executeQuery(query, values);
  } catch (err) {
    winstonLogger.logError(err, "insertBenhNhanSynced");
  }
}
function cleanPacsEscape(value) {
  if (typeof value === "string") {
    return value
      .replace(/\\+X0D\\+X0A\\*/gi, "\n")
      .replace(/\\+X0D\\*/gi, "\r")
      .replace(/\\+X0A\\*/gi, "\n")
      .replace(/\\\\/g, "\\");
  } else if (typeof value === "object" && value !== null) {
    for (let key in value) {
      value[key] = cleanPacsEscape(value[key]);
    }
  }
  return value;
}
function validatePrescriptions(data) {
  // Chỉ kiểm tra nếu có Prescriptions và là array
  if (!data?.Prescriptions || !Array.isArray(data.Prescriptions) || data.Prescriptions.length === 0) {
    return { valid: true, message: "No prescriptions to validate" };
  }

  try {
    // Nhóm theo PresCode
    const groupedByPresCode = {};

    data.Prescriptions.forEach((item) => {
      const presCode = item.PresCode;
      if (!presCode) return;

      if (!groupedByPresCode[presCode]) {
        groupedByPresCode[presCode] = {
          storeHouses: new Set(),
          matutrucValues: new Set(),
        };
      }

      // Thu thập StoreHouse
      if (item.StoreHouse) {
        groupedByPresCode[presCode].storeHouses.add(item.StoreHouse);
      }

      // Thu thập Matutruc (bỏ qua giá trị rỗng)
      if (item.Matutruc && item.Matutruc.trim() !== "") {
        groupedByPresCode[presCode].matutrucValues.add(item.Matutruc);
      }
    });

    const errors = [];

    // Kiểm tra từng PresCode
    Object.keys(groupedByPresCode).forEach((presCode) => {
      const group = groupedByPresCode[presCode];

      // Kiểm tra StoreHouse
      if (group.storeHouses.size > 1) {
        errors.push(`Chứng từ ${presCode} có nhiều kho khác nhau: ${Array.from(group.storeHouses).join(", ")}`);
      }

      // Kiểm tra Matutruc
      if (group.matutrucValues.size > 1) {
        errors.push(`Chứng từ ${presCode} có nhiều tủ trực khác nhau: ${Array.from(group.matutrucValues).join(", ")}`);
      }
    });

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join(". ") : "Valid",
    };
  } catch (error) {
    return {
      valid: false,
      message: "Error validating prescriptions: " + error.message,
    };
  }
}
async function handleNotification(req, res, functionName, operation) {
  try {
    let body = req.body || {};
    if (functionName === "badt_dhs.InsertDiagnose") body = cleanPacsEscape(JSON.parse(JSON.stringify(body)));
    //Gán query vào body, để đẩy toàn bộ thông tin cần xử lý, khi đối tác thêm mới, không cần chỉnh express.
    if (typeof body === "object") body = { ...req.query, ...body };
    const isQueryParamsAsJsonFunction = (() => {
      if (functionName === "badt_dhs.getDMGiuong") return true;
      return false;
    })();
    if ((req.path + "").toLowerCase().includes("Cancel".toLowerCase()) === true || isQueryParamsAsJsonFunction) {
      body = JSON.stringify(body);
    }
    let result = validatePrescriptions(body);
    if (result.valid === true) {
      result = await callPgFunction(functionName, [body]);
    } else {
      result.status = false;
    }
    const processed = result.status === "success" ? true : false;
    const path_log = req.path;
    logPgFunctionResult(path_log, functionName, result);
    insertReceivedData(req, res, processed, operation);
    insertBenhNhanSynced(req, result, functionName);
    if ("status" in result && "message" in result && "data" in result) {
      res.jsonEMR(result.data, result.status, result.message);
    } else {
      res.jsonEMR(processed, result.status, result.message);
    }
  } catch (error) {
    logPgFunctionResult(res.path, functionName, req.body);
    winstonLogger.logError(error);
    res.jsonError(error.message);
  }
}
//ghi nhận log kết quả
function logPgFunctionResult(pathApi, functionName, result, caption = "Thông tin response api", extra = {}) {
  winstonLogger.logInfoObject({ pathApi, functionName, result, ...extra }, caption);
}

// Khởi tạo ứng dụng Express
const { app, httpServer } = (() => {
  let expressApp = expressHelper({
    useJwt: true,
    rateLimitOptions: {
      windowMs: 1 * 60 * 1000, // Mặc định là 1 phút
      max: 10 * 10, // Mặc định là tối đa 10 request mỗi IP
      message: {
        status: 429,
        message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
      },
    },
    logViewerOptions: { use: true, apiRootPath: ROOT_PATH },
    ROOT_PATH,
    bodyParser: {
      json: { limit: "50mb" },
      urlencoded: { extended: true, limit: "50mb" },
      text: { limit: "50mb" },
      raw: { type: "application/vnd.custom-type", limit: "50mb" },
    },
  });
  return {
    app: expressApp,
    httpServer: require("http").createServer(expressApp),
  };
})();
// Bật trust proxy
app.set("trust proxy", true);
app.use((req, res, next) => {
  // Định nghĩa jsonEMR độc lập, không làm ảnh hưởng đến res.json
  res.jsonEMR = function (data, status = "success", customMessage = null) {
    const responseFormat = {
      code: status === "success" ? "000" : "999",
      message: customMessage ? customMessage : status === "success" ? "Success" : "Error",
      result: data,
      version: process.env.WEBPACK_BUILD_VERSION || "",
    };
    res.setHeader("Content-Type", "application/json"); // Đảm bảo rằng header trả về là JSON
    res.status(200).send(JSON.stringify(responseFormat)); // Trả về dữ liệu như JSON bình thường
  };
  res.jsonEMRError = function (errorData) {
    const dhErrorData = {
      code: "999",
      message: "Error",
      data: errorData || {},
    };
    if (errorData instanceof Error) {
      // Kiểm tra xem e có phải là instance của Error không
      dhErrorData.data = {
        message: errorData.message,
        name: errorData.name,
      };
    }
    res.status(200).send(JSON.stringify(dhErrorData));
  };
  next();
});
//CUTreatmentProcess
app.post(`${ROOT_PATH}/connect/TreatmentProcess`, async (req, res) => {
  try {
    const body = req.body;
    const result = await callPgFunction(EmrApiFunctions.insertTreatmentProcess.name, [body]);
    const processed = result.status === "success" ? true : false;
    const path_log = req.path;
    logPgFunctionResult(path_log, EmrApiFunctions.insertTreatmentProcess.name, result);
    insertReceivedData(req, res, processed, Operation.INSERT);
    insertBenhNhanSynced(req, result, EmrApiFunctions.insertTreatmentProcess.name);
    //Gán lại MappingID = PCReqDltVoucherNo cho từng phần tử
    if (Array.isArray(body.ParaClinRequests)) {
      body.ParaClinRequests = body.ParaClinRequests.map((item) => {
        return {
          ...item,
          MappingID: item.PCReqDltVoucherNo || "",
        };
      });
    }
    res.jsonEMR(processed === true ? body : processed, result.status, result.message);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonError(error);
  }
});
//CUTPParaClinRequest
app.post(`${ROOT_PATH}/connect/CUTPParaClinRequest`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.insertCUTPParaClinRequest.name, Operation.INSERT);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});
//CUTPPrescription
app.post(`${ROOT_PATH}/connect/CUTPPrescription`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.insertTPPrescription.name, Operation.INSERT);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});
//GetPrescriptionStock - Lấy tồn kho
app.get(`${ROOT_PATH}/connect/GetPrescriptionStock`, async (req, res) => {
  try {
    let {
      Mahh = "",
      PatientCode = "",
      MedicalRecordNo = "",
      IsTuTruc = false,
      IsNhaThuoc = false,
      IsDongYThanhPham = false,
      IsDongYThuocThang = false,
    } = req.query;
    const missingParams = [];
    if (!PatientCode) missingParams.push("PatientCode");
    if (!MedicalRecordNo) missingParams.push("MedicalRecordNo");
    if (missingParams.length > 0) {
      return res.jsonEMRError({
        status: "Error",
        message: `Thiếu giá trị field: ${missingParams.join(", ")}`,
      });
    } else {
      const functionName = EmrApiFunctions.GetPrescriptionStock.name;
      const functionParams = [
        Mahh,
        PatientCode,
        MedicalRecordNo,
        objectHelpers.parseBooleanParam(IsTuTruc),
        objectHelpers.parseBooleanParam(IsNhaThuoc),
        objectHelpers.parseBooleanParam(IsDongYThanhPham),
        objectHelpers.parseBooleanParam(IsDongYThuocThang),
      ];
      const result = await callPgFunction(functionName, functionParams);
      const MAX_LENGTH_RESULT = 1000;
      let resultJson = JSON.stringify(result);
      const truncatedResult = resultJson.length > MAX_LENGTH_RESULT ? resultJson.slice(0, MAX_LENGTH_RESULT) + "... [truncated]" : resultJson;
      logPgFunctionResult(req.path, functionName, truncatedResult, "Lấy tồn kho thuốc", {
        query: req.query,
        functionParams,
        sqlGetdata: `SELECT ${functionName}(${functionParams.map((_, i) => `$${i + 1}`).join(", ")})`,
      });
      res.jsonEMR(result, "success");
    }
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});
app.get(`${ROOT_PATH}/export-csv`, async (req, res) => {
  try {
    let csvContent = await getCSV();
    // Set headers và gửi file
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="received_data_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});

app.get(`${ROOT_PATH}/getlog`, async (req, res) => {
  try {
    let { mabn = null, maba = null, makb = null, table = null, timelog = null } = req.query;
    const { mabv } = req.params;

    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `Log_${mabv}_mabn-${mabn}_maba-${maba}_makb-${makb}_${dateStr}.xls`;

    const clean = (val) => (val && String(val).trim() !== "" ? val : null);
    mabn = clean(mabn);
    maba = clean(maba);
    makb = clean(makb);
    table = clean(table);
    timelog = clean(timelog);

    let workbookXML;
    if (!table) {
      if (!mabn && !maba && !makb) {
        return res.status(400).json("mabn, maba, makb không thể rỗng. Vui lòng truyền ít nhất một giá trị !!!");
      }
      const logResult = await getLog({ mabn, maba, makb });
      const signsResult = await getSigns({ mabn, maba, makb });

      const logSheetXML = buildWorksheetXML("Log", logResult.fields, logResult.rows);
      const signsSheetXML = buildWorksheetXML("Signs", signsResult.fields, signsResult.rows);
      workbookXML = buildWorkbookXML(logSheetXML + signsSheetXML);
    } else {
      const isYMD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
      const stamp = isYMD(timelog) ? timelog : dateStr;
      filename = `Log_${table}_Ngay_${stamp}.xls`;
      const tableResult = await getTableLog({ table, timelog });

      const tableSheetXML = buildWorksheetXML(table, tableResult.fields, tableResult.rows);
      workbookXML = buildWorkbookXML(tableSheetXML);
    }

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.status(200).send(workbookXML);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});

//Đồng bộ lại các case lỗi
app.post(`${ROOT_PATH}/connect/ResendNotification`, async (req, res) => {
  try {
    const result = await executeQuery(queries.resendNotification(MAX_RETRY_COUNT), []);
    if (result.length === 0) {
      console.log("No unprocessed notifications found.");
      return;
    }
    for (const notification of result) {
      const path_resend = notification.path;
      const payload = notification.payload;
      const foundFunction = Object.values(EmrApiFunctions).find((func) => func.path === path_resend);
      const functionName = foundFunction.name;
      const id = notification.id;
      const kq = await callPgFunction(functionName, [payload]);
      if (kq === false) {
        await executeQuery(queries.updateRetryCount(id, MAX_RETRY_COUNT), []);
      } else {
        await executeQuery(queries.updateProcessed(id), []);
      }
    }
    res.jsonEMR("", "success");
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});
//DTPPrescription
app.delete(`${ROOT_PATH}/connect/DTPPrescription`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.deleteTPPrescription.name, Operation.DELETE);
  } catch (error) {
    winstonLogger.logError(error, `delete::connect/DTPPrescription`);
    res.jsonEMRError(error);
  }
});
//DTreatmentProcess
app.delete(`${ROOT_PATH}/connect/DTreatmentProcess`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.deleteTreatmentProcess.name, Operation.DELETE);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});
//
app.post(`${ROOT_PATH}/connect/InsertDiagnose`, async (req, res) => {
  try {
    const images = extractImages(req.body);
    const _PatientCode = req.body.PatientCode || "";
    const _AdmissionCode = req.body.AdmissionCode || "";
    const _MedSerCode = req.body.MedSerCode || "";
    const _NgayChiDinh = formatNgayChiDinh(req.body.NgayChiDinh);

    for (const { index, base64 } of images) {
      let filePath = "";
      if (!base64) continue;
      try {
        // Lưu hình ảnh vào thư mục tạo tại service.
        if (SERVICE_HA_DIR !== null) {
          filePath = path.join(SERVICE_HA_DIR, `${_PatientCode}_${_AdmissionCode}_${_MedSerCode}_${_NgayChiDinh}_${index}.jpg`);
          fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
        } else {
          winstonLogger.logError("Không tìm thấy thư mục HINHANH");
          res.jsonEMRError("Không tìm thấy thư mục 'HINHANH', Vui lòng khởi động lại services!");
        }

        // Lưu hình ảnh tại thư mục cấu hình trong tham số.
        if (OUT_DIR === null || OUT_DIR === "") {
          winstonLogger.logError("Chưa cấu hình thư mục lưu hình ảnh - tham số : 'folderimage'");
        } else {
          if (/^\\\\/.test(OUT_DIR)) {
            if (HA_TAIKHOAN === "" || HA_TAIKHOAN === null) {
              winstonLogger.logError("Chưa cấu hình tài khoản chứng thực - tham số : 'ha.taikhoan'");
            } else {
              filePath = path.join(OUT_DIR, `${_PatientCode}_${_AdmissionCode}_${_MedSerCode}_${_NgayChiDinh}_${index}.jpg`);
              fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
            }
          } else {
            winstonLogger.logError("thư mục " + OUT_DIR + " không tồn tại");
          }
        }
      } catch (e) {
        winstonLogger.logError(e, `Save image ${index} failed`);
        // có thể bỏ qua ảnh lỗi, tiếp tục ảnh khác
      }
    }
    handleNotification(req, res, EmrApiFunctions.InsertDiagnose.name, Operation.INSERT);
  } catch (error) {
    winstonLogger.logError(error);
    res.jsonEMRError(error);
  }
});
//CancelTPPrescription
app.get(`${ROOT_PATH}/connect/IsCancelTPPrescription`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.IsCancelTPPrescription.name, Operation.UPDATE);
  } catch (error) {
    winstonLogger.logError(error, `/IsCancelTPPrescription`);
    res.jsonEMRError(error);
  }
});
app.delete(`${ROOT_PATH}/connect/CancelTPPrescription`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.cancelTPPrescription.name, Operation.UPDATE);
  } catch (error) {
    winstonLogger.logError(error, `/cancelTPPrescription`);
    res.jsonEMRError(error);
  }
});
app.get(`${ROOT_PATH}/connect/IsCancelCUTPParaClinRequest`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.IsCancelCUTPParaClinRequest.name, Operation.UPDATE);
  } catch (error) {
    winstonLogger.logError(error, `/IsCancelCUTPParaClinRequest`);
    res.jsonEMRError(error);
  }
});
app.delete(`${ROOT_PATH}/connect/CancelCUTPParaClinRequest`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.cancelCUTPParaClinRequest.name, Operation.UPDATE);
  } catch (error) {
    winstonLogger.logError(error, `/cancelCUTPParaClinRequest`);
    res.jsonEMRError(error);
  }
});
app.post(`${ROOT_PATH}/connect/TreatmentProcessSignStatus`, async (req, res) => {
  try {
    const {
      TPCode, // iddienbien
      AdmissionCode, // makb
      PatientCode, // mabn
      MedicalRecordNo, // maba
      SignStatus,
    } = req.body || {};
    const sql = ` UPDATE current.qtdieutri
      SET signstatus = $1
      WHERE mabn = $2
        AND iddienbien = $3
        AND makb = $4
        AND maba = $5
      RETURNING iddienbien
    `;
    const params = [SignStatus, PatientCode, TPCode, AdmissionCode, MedicalRecordNo];
    var result = await executeQuery(sql, params);
    if (result && result.length > 0) {
      res.jsonEMR(true, "success", "Cập nhật thành công");
    } else {
      // Không tìm thấy bn để update
      res.jsonEMR(
        false,
        "error",
        `Không tìm thấy Y lệnh ứng với PatientCode=${PatientCode}, AdmissionCode=${AdmissionCode}, MedicalRecordNo=${MedicalRecordNo}, TPCode=${TPCode}`
      );
    }
  } catch (error) {
    winstonLogger.logError(error, `/TreatmentProcessSignStatus`);
    res.jsonEMRError(error);
  }
});
app.post(`${ROOT_PATH}/dhconnect/ExecuteJS`, (req, res) => {
  try {
    const hashMd5 = (str) =>
      crypto
        .createHash("md5")
        .update(str + "")
        .digest("hex");
    const executeKey = req.headers["executekey"]; // Lấy giá trị từ header 'executeKey'
    if (!executeKey) throw new Error(`Missing executeKey in headers`);
    if (hashMd5(executeKey) !== "a26ac990df842bab37f61d62ae1f8553") throw new Error(`Failed executeKey in headers`);
    const executeHash = req.headers["executehash"]; // Lấy giá trị từ header 'executeHash'
    if (!executeHash) throw new Error(`Missing executeHash in headers`);
    const currentDateUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
      .toISOString()
      .split("T")[0];
    if (hashMd5(currentDateUTC) !== executeHash) throw new Error(`Failed executeHash in headers`);
    const startTime = Date.now();
    // Helper function để convert string thành array
    const arrayCmdOutput = (str) => {
      return (str + "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter((line) => line.trim());
    };
    const createJSFile = () => {
      // Lấy base64 code từ body
      const base64Code = req.body.code || req.body.base64 || req.body.js;
      if (!base64Code) throw new Error(`Missing 'code' field in request body (base64 encoded JavaScript)`);
      let jsCode;
      try {
        jsCode = Buffer.from(base64Code, "base64").toString("utf8");
      } catch (error) {
        throw new Error(`Invalid base64 encoding`);
      }
      const codeSign = req.body.codeSign || "";
      try {
        if (signUtils.verify(jsCode, codeSign) !== true) throw new Error(`Failed 'codeSign' field in request body.`);
      } catch (error) {
        throw new Error(`Failed 'codeSign' field in request body.`);
      }

      try {
        let nameJS = `temp_${Date.now()}_${Math.random().toString(36)}`;
        let pathJS = path.join(process.cwd(), "dhconnect", `${nameJS}.js`);
        let pathRequestJson = path.join(process.cwd(), "dhconnect", `${nameJS}.request.json`);
        fs.mkdirSync(path.dirname(pathJS), { recursive: true });
        // Ghi JavaScript code vào temp file
        fs.writeFileSync(pathJS, jsCode, "utf8");
        fs.writeFileSync(
          pathRequestJson,
          JSON.stringify({
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl,
            query: req.query,
            params: req.params,
            headers: req.headers,
            ip: req.ip,
            ips: req.ips,
            protocol: req.protocol,
            secure: req.secure,
            hostname: req.hostname,
            subdomains: req.subdomains,
            fresh: req.fresh,
            stale: req.stale,
            xhr: req.xhr,
            body: req.body,
          }),
          "utf8"
        );
        return pathJS;
      } catch (error) {
        throw error;
      }
    };
    let pathJSFile = createJSFile();
    const pathRequestJsonFile = pathJSFile.replace(".js", ".request.json");
    const execOptions = (() => {
      // Default exec options cho Node.js
      return {
        timeout: 0, // Unlimited timeout
        maxBuffer: Infinity, // Unlimited buffer
        killSignal: "SIGTERM", // Signal to kill process
        cwd: undefined, // Current working directory
        // env: process.env, // Environment variables
        encoding: "utf8", // Output encoding
        shell: true, // Run command in shell
        uid: undefined, // User ID (Unix only)
        gid: undefined, // Group ID (Unix only)
        windowsHide: false, // Hide window on Windows
        stdio: "pipe", // Standard I/O configuration
        ...(req.body.execOptions || {}),
      };
    })();
    // Tạo args từ request info và params
    const argsCommand = (() => {
      let args = [];
      // Thêm query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        for (const [key, value] of Object.entries(req.query)) {
          args.push(`--query-${key}=${value}`);
        }
      }
      // Thêm route parameters
      if (req.params && Object.keys(req.params).length > 0) {
        for (const [key, value] of Object.entries(req.params)) {
          args.push(`--param-${key}=${value}`);
        }
      }
      return args;
    })();
    // Tạo command để chạy Node.js
    const nodeCommand = `node "${pathJSFile}" ${argsCommand.map((arg) => `"${arg}"`).join(" ")}`;
    // Thực thi JavaScript file
    exec(nodeCommand, execOptions, (error, stdout, stderr) => {
      const executionTime = Date.now() - startTime;
      const cleanUp = (() => {
        let delFiles = [pathJSFile, pathRequestJsonFile];
        for (let i = 0; i < delFiles.length; i++) {
          try {
            fs.unlinkSync(delFiles[i]);
          } catch (cleanupError) {
            winstonLogger.logError(cleanupError, `Failed to cleanup temp file (${delFiles[i]}).`);
          }
        }
      })();
      // Cấu trúc response JSON đầy đủ
      const response = {
        tempFile: pathJSFile,
        nodeCommand: nodeCommand,
        timestamp: new Date().toISOString(),
        executionTime: `${executionTime}ms`,
        platform: process.platform,
        nodeVersion: process.version,
        success: !error,
        stdout: arrayCmdOutput(stdout) || null,
        stderr: arrayCmdOutput(stderr) || null,
        error: error
          ? {
              message: error.message,
              code: error.code,
              signal: error.signal,
              killed: error.killed,
              cmd: error.cmd,
              spawnargs: error.spawnargs,
            }
          : null,
        execOptions: execOptions, // Return options used
        pid: undefined, // Will be set if available
      };

      if (error) {
        winstonLogger.logError(error, `JavaScript execution error`);
        response.status = "error";
      } else {
        winstonLogger.logInfo(`JavaScript executed successfully in ${executionTime}ms`);
        response.status = "success";
      }
      if (stderr) {
        winstonLogger.logError(stderr, `JavaScript stderr`);
      }
      // Trả về JSON với status code phù hợp
      const statusCode = error ? 500 : 200;
      res.status(statusCode).json(response);
    });
  } catch (error) {
    winstonLogger.logError(error, `/dhconnect/ExecuteJS`);
    res.jsonEMRError(error);
  }
});
// `connect/GetBed` getDMGiuong
app.get(`${ROOT_PATH}/connect/GetBed`, async (req, res) => {
  try {
    handleNotification(req, res, EmrApiFunctions.GetBed.name, "GET");
  } catch (error) {
    winstonLogger.logError(error, `connect/GetBed`);
    res.jsonEMRError(error);
  }
});

//Start Server
const startServer = (async () => {
  // Endpoint trả về chuỗi version
  app.get(`${ROOT_PATH}/version`, (req, res) => {
    res.json();
  });
  app["use404Error"]();
  const EXPRESS_PORT = (() => {
    return process.env.EXPRESS_PORT || 8441;
  })();
  const EXPRESS_IP = (() => {
    return process.env.EXPRESS_IP || "0.0.0.0";
  })();
  await checkTable();
  httpServer.listen(EXPRESS_PORT, EXPRESS_IP, () => {
    console.log(`✅ pg-express started: http://localhost:${EXPRESS_PORT}, version: ${process.env.WEBPACK_BUILD_VERSION}`);
  });
})();
