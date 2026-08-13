const axios = require("axios");
const dotenvHelper = require("../../../helpers/dotenvHelper");
const axiosHelper = require("../../../helpers/axiosHelper");
const objectHelpers = require("../../../helpers/objectHelpers");
const winstonLogger = require("../../../helpers/winstonLogger");

const valOfENV = (KEY = "") => objectHelpers.getPropertyValueIgnoreCaseForceEmpty(process.env, KEY);

const EMR_URL = valOfENV("EMR_URL");
const EMR_USERNAME = valOfENV("EMR_USERNAME");
const EMR_PASSWORD = valOfENV("EMR_PASSWORD");
const EMR_URLPATH_TOKEN = `server/his-server/api/Auth/Login`;

let CACHED_TOKEN = { access_token: "", exp: 0 };

async function getAccessToken() {
  try {
    if (
      CACHED_TOKEN &&
      "access_token" in CACHED_TOKEN &&
      "exp" in CACHED_TOKEN &&
      CACHED_TOKEN.access_token !== "" &&
      Date.now() < Number(CACHED_TOKEN.exp)
    ) {
      return CACHED_TOKEN.access_token;
    }
    let config = {
      url: `${EMR_URL}/${EMR_URLPATH_TOKEN}`,
      method: "POST",
      data: { Username: EMR_USERNAME, Password: EMR_PASSWORD },
    };
    let res = await axiosHelper.jsonFetch(config);
    if ("Data" in res && res.Data !== "") {
      CACHED_TOKEN.access_token = res.Data;
      CACHED_TOKEN.exp = (() => {
        try {
          const payloadBase64 = CACHED_TOKEN.access_token.split(".")[1];
          const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf8");
          return JSON.parse(payloadJson).exp * 1000;
        } catch (error) {
          winstonLogger.logError(error, `CACHED_TOKEN.exp`);
          winstonLogger.logInfoObject(res, `CACHED_TOKEN.exp`);
        }
      })();
      return CACHED_TOKEN.access_token;
    }
    throw new Error(`Không lấy được token trong response. config: ${JSON.stringify(config)}. cachedToken: ${JSON.stringify(CACHED_TOKEN)}`);
  } catch (error) {
    throw error;
  }
}
async function sendData({ method = "POST", pathApi = "", data = undefined } = {}) {
  try {
    let config = {
      url: `${EMR_URL}/${pathApi}`,
      method,
      access_token: await getAccessToken(),
      data,
    };
    return await axiosHelper.jsonFetch(config);
  } catch (error) {
    throw error;
  }
}
const ResOK = (resResult) => {
  try {
    if (typeof resResult === "undefined" || resResult === null) return false;
    if ("ErrorCode" in resResult !== true) return false;
    return Number(objectHelpers.getPropertyValueIgnoreCaseForceEmpty(resResult, "ErrorCode")) === Number(0);
  } catch (error) {
    return false;
  }
};

module.exports = { sendData, ResOK };
