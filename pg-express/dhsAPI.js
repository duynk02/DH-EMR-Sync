//Xử lý các nghiệp vụ với DHS-API
const dotenvHelper = require("../../../helpers/dotenvHelper.js");
const objectHelpers = require("../../../helpers/objectHelpers.js");
const valOfENV = (KEY = "") => objectHelpers.getPropertyValueIgnoreCaseForceEmpty(process.env, KEY);
const jwt = require("jsonwebtoken");
const SECRET_KEY = valOfENV("DHS_TOKEN");
const { callPgFunction } = require("./pgAPI.js");
const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null; // thời gian token hết hạn

const EmrApiFunctions = {
  getSyncCountry: { name: "badt_dhs.getSyncCountry", path: "/server/his-server/api/SyncData/SyncCountry", method: "POST" },
  getSyncCityProvince: { name: "badt_dhs.GetSyncCityProvince", path: "/server/his-server/api/SyncData/SyncCityProvince", method: "POST" },
  getSyncDistrict: { name: "badt_dhs.getSyncDistrict", path: "/server/his-server/api/SyncData/SyncDistrict", method: "POST" },
  getSyncWard: { name: "badt_dhs.getSyncWard", path: "/server/his-server/api/SyncData/SyncWard", method: "POST" },
  getSyncDepartment: { name: "badt_dhs.getSyncDepartment", path: "/server/his-server/api/SyncData/SyncDepartment", method: "POST" },
  getSyncEthnic: { name: "badt_dhs.getSyncEthnic", path: "/server/his-server/api/SyncData/SyncEthnic", method: "POST" },
  getSyncICD: { name: "badt_dhs.getSyncICD", path: "/server/his-server/api/SyncData/SyncICD", method: "POST" },
  getSyncOccupation: { name: "badt_dhs.getSyncOccupation", path: "/server/his-server/api/SyncData/SyncOccupation", method: "POST" },
  getSyncACD: { name: "badt_dhs.getSyncACD", path: "/server/his-server/api/SyncData/SyncACD", method: "POST" },
  getSyncEmployee: { name: "badt_dhs.getSyncEmployee", path: "/server/his-server/api/SyncData/SyncEmployee", method: "POST" },
  getSyncStoreHouse: { name: "badt_dhs.getSyncStoreHouse", path: "/server/his-server/api/SyncData/SyncStoreHouse", method: "POST" },
  getSyncRoom: { name: "badt_dhs.getSyncRoom", path: "/server/his-server/api/SyncData/SyncRoom", method: "POST" },
  getSyncBed: { name: "badt_dhs.getSyncBed", path: "/server/his-server/api/SyncData/SyncBed", method: "POST" },
  getSyncADM: { name: "badt_dhs.getSyncADM", path: "/server/his-server/api/SyncData/SyncADM", method: "POST" },
  getSyncPATFR: { name: "badt_dhs.getSyncPATFR", path: "/server/his-server/api/SyncData/SyncPATFR", method: "POST" },
  getSyncDCHG: { name: "badt_dhs.getSyncDCHG", path: "/server/his-server/api/SyncData/SyncDCHG", method: "POST" },
  insertTreatmentProcess: { name: "badt_dhs.insertTreatmentProcess", path: "/api/badt:mabv/connect/TreatmentProcess", method: "POST" },
  insertCUTPParaClinRequest: { name: "badt_dhs.InsertCUTPParaClinRequest", path: "/api/badt:mabv/connect/CUTPParaClinRequest", method: "POST" },
  insertTPPrescription: { name: "badt_dhs.insertTPPrescription", path: "/api/badt:mabv/connect/CUTPPrescription", method: "POST" },
  GetPrescriptionStock: { name: "badt_dhs.getInventoryMedicalRecordNo", path: "/api/badt:mabv/connect/GetPrescriptionStock", method: "GET" },
  deleteTPPrescription: { name: "badt_dhs.deleteTPPrescription", path: "/api/badt:mabv/connect/DTPPrescription", method: "DELETE" },
  deleteTreatmentProcess: { name: "badt_dhs.deleteTreatmentProcess", path: "/api/badt:mabv/connect/DTreatmentProcess", method: "DELETE" },
  InsertDiagnose: { name: "badt_dhs.InsertDiagnose", path: "/api/badt:mabv/connect/InsertDiagnose", method: "POST" },
  cancelTPPrescription: { name: "badt_dhs.cancelTPPrescription", path: "/api/badt:mabv/connect/CancelTPPrescription", method: "DELETE" },
  cancelCUTPParaClinRequest: {
    name: "badt_dhs.cancelCUTPParaClinRequest",
    path: "/api/badt:mabv/connect/CancelCUTPParaClinRequest",
    method: "DELETE",
  },
  IsCancelTPPrescription: { name: "badt_dhs.IsCancelTPPrescription", path: "/api/badt:mabv/connect/IsCancelTPPrescription", method: "GET" },
  IsCancelCUTPParaClinRequest: {
    name: "badt_dhs.IsCancelCUTPParaClinRequest",
    path: "/api/badt:mabv/connect/IsCancelCUTPParaClinRequest",
    method: "GET",
  },
  GetBed: { name: "badt_dhs.getDMGiuong", path: "/api/badt:mabv/connect/GetBed", method: "GET" },
};
// Call API lấy token mới
async function fetchNewToken() {
  try {
    var config = {
      method: "POST",
      url: valOfENV("EMR_URL") + "/server/his-server/api/Auth/Login",
      data: {
        Username: valOfENV("EMR_USERNAME"),
        Password: valOfENV("EMR_PASSWORD"),
      },
    };
    const data = await axios(config).then((res) => res.data);
    if (data && data.Data) {
      cachedToken = data.Data;
      // Giải mã payload token (Base64 decode)
      const payloadBase64 = cachedToken.split(".")[1];
      const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf8");
      const payload = JSON.parse(payloadJson);

      // Lấy thời điểm hết hạn token
      if (payload.exp) {
        tokenExpiry = payload.exp * 1000;
      } else {
        tokenExpiry = null;
      }
      return cachedToken;
    } else {
      throw new Error("Không lấy được token trong response.");
    }
  } catch (error) {
    console.error("Lỗi khi lấy token:", error.message);
    throw error;
  }
}
// Hàm lấy token, trả token cached nếu còn hạn, nếu hết hạn gọi fetch lại
async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  return await fetchNewToken();
}
/**
 * Gọi API gửi dữ liệu cho đối tác.
 *
 * @param {Object} apiFunc - Enum EmrApiFunctions - gồm các trường:
 *                           - path: đường dẫn api phía đối tác
 *                           - name: tên hàm PostgreSQL gọi lấy dữ liệu (string)
 *                           - method: phương thức HTTP (string, ví dụ 'POST')
 * @param {Array} params - Mảng các tham số truyền vào hàm PostgreSQL.
 *
 * @example
 * // Ví dụ sử dụng hàm CallApiEMR với enum EmrApiFunctions
 * const result = await CallApiEMR(EmrApiFunctions.getSyncICD);
 * Or
 * const result = await CallApiEMR(EmrApiFunctions.getSyncICD, ['A97']);
 */
async function CallApiEMR(apiFunc, params) {
  const path = apiFunc.path;
  //const body = await callPgFunction(apiFunc.name,params) || {};
  const token = await getToken();
  const method = (apiFunc.method || "POST").toUpperCase();
  var config = {
    method: method,
    url: valOfENV("EMR_URL") + path,
    headers: {
      Authorization: "Bearer " + token,
    },
  };

  if (method !== "POST") {
    // Truyền params vào query string
    config.params = params || {};
  } else {
    const body = (await callPgFunction(apiFunc.name, params)) || {};
    config.data = body;
  }
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        error: true,
        status: error.response.status,
        data: error.response.data,
      };
    } else {
      return {
        error: true,
        message: error.message,
      };
    }
  }
}
function addApiRoute(app, method, path, functionName, middlewares = []) {
  app[method](path, ...middlewares, async (req, res) => {
    try {
      const params = req.method === "GET" ? Object.values(req.query) : req.body.params || [];
      const data = await callPgFunction(functionName, params);
      res.json({ success: true, data });
    } catch (error) {
      console.error(`Lỗi tại ${path}:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
}

module.exports = {
  addApiRoute,
  getToken,
  CallApiEMR,
  EmrApiFunctions,
};
