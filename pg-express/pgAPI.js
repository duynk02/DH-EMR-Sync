const path = require("path");
const fs = require("fs");
//Xử lý các nghiệp vụ với PostgreSQL

const winstonLogger = require("../../../helpers/winstonLogger");
const dotenvHelper = require("../../../helpers/dotenvHelper");
const objectHelpers = require("../../../helpers/objectHelpers");
const PgHelper = require("../../../modulers/PgHelper");
const configFunctions = require("../pg-services/configFunction");
const queries = require("./queries");

const valOfENV = (KEY = "") => objectHelpers.getPropertyValueIgnoreCaseForceEmpty(process.env, KEY);
const dbHelper = new PgHelper(
  valOfENV("PGDATA_USER"),
  valOfENV("PGDATA_HOST"),
  valOfENV("PGDATA_DATABASE"),
  valOfENV("PGDATA_PASSWORD"),
  valOfENV("PGDATA_PORT")
);
const executeQuery = async (queryText, params = []) => {
  try {
    return await dbHelper.executeQuery(queryText, params);
  } catch (error) {
    throw error;
  }
};
async function callPgFunction(functionName, params = []) {
  try {
    const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `SELECT ${functionName}(${placeholders})`;
    winstonLogger.logInfoObject({ sql, params });
    var rows = await executeQuery(sql, params);
    const result = rows[0][Object.keys(rows[0])[0]];
    if (result && typeof result === "string") {
      try {
        return JSON.parse(result) || null;
      } catch (err) {
        throw new Error(`Lỗi phân tích JSON: ${err.message}`);
      }
    } else {
      return result;
    }
  } catch (err) {
    console.error(`Lỗi khi gọi hàm PostgreSQL "${functionName}":`, err.message);
    winstonLogger.logError(err);
    throw err;
  }
}

//Insert Received Data
async function insertReceivedData(req, res, processed, operation) {
  const pathInsert = req.path; // Truy cập đường dẫn URL từ req
  const bodyData = req.body;
  let { query = ``, params = [] } = {};
  try {
    ({ query, params } = queries.insertReceived_data(pathInsert, bodyData, processed, operation));
    kq = await executeQuery(query, params);
    if (!kq || kq.length === 0 || !kq[0].id) {
      return res.jsonEMRError("Đồng bộ dữ liệu không thành công");
    }
    return kq;
  } catch (error) {
    winstonLogger.logError(error, "Error inserting data");
    winstonLogger.logInfoObject({ message: error.message, pathInsert, query, params }, "Error inserting data");
    throw error;
  }
}
// Hàm đọc và thực thi câu lệnh SQL từ file
async function executeSqlFromCode(functionName, sqlCode) {
  try {
    await executeQuery(sqlCode);
  } catch (err) {
    winstonLogger.logError(err, `Error executing SQL for ${functionName}`);
    winstonLogger.logInfo(sqlCode, `SQL for ${functionName}`);
  }
}
// Hàm kiểm tra và tạo function từ EmrApiFunctions và configFunction.js
async function dropAndCreateFunctions(EmrApiFunctions) {
  for (const funcKey in EmrApiFunctions) {
    const functionName = EmrApiFunctions[funcKey].name; // Lấy tên function từ EmrApiFunctions
    // Chuyển tên function thành chữ thường để không phân biệt hoa thường
    const lowerCaseFunctionName = functionName.toLowerCase();
    // Kiểm tra xem function có tồn tại trong configFunctions không
    const functionConfig = Object.keys(configFunctions).find((key) => key.toLowerCase() === lowerCaseFunctionName);
    // Lấy mã SQL từ configFunction.js
    let sqlCode = configFunctions[functionConfig].codesql;
    //Thêm DROP để bảo đảm bảo thay đổi
    //[ÔNG TRIỆU HẬU - 2025-08-16] Xử lý đối với Postgres 9.4, Quân Dân Y Cần Thơ
    const dropSQLPostgres94 = (() => {
      return `
DO
$$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE LOWER('badt_dhs.'||p.proname) LIKE LOWER('${functionName}')
    LOOP
        EXECUTE format(
            'DROP FUNCTION IF EXISTS %I.%I(%s);',
            rec.nspname, rec.proname, rec.args
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;    
    `;
    })();
    sqlCode = `;${dropSQLPostgres94}; \n` + sqlCode;
    //Bỏ kiểm tra, lúc nào cũng phải chạy cập nhật hàm lại, khi các thành viên khác thay đổi file SQL
    await executeSqlFromCode(functionName, sqlCode);
  }
}

async function getCSV(query = "SELECT * FROM badt_dhs.received_data", params = []) {
  try {
    const result = await dbHelper.executePoolQuery(query, params);
    const csvCell = (val) => {
      if (val === null || val === undefined) return "";
      let s;
      if (val instanceof Date) s = val.toISOString();
      else if (typeof val === "bigint") s = val.toString();
      else if (typeof val === "object") s = JSON.stringify(val);
      else s = String(val);

      const escaped = s.replace(/"/g, '""');
      // Chỉ quote khi cần để Excel vẫn nhận số đúng kiểu
      return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
    };
    // Header
    const header = result.fields.map((f) => f.name).join(",") + "\n";
    // Rows
    const rows = result.rows.map((row) => result.fields.map((f) => csvCell(row[f.name])).join(",")).join("\n");
    return "\uFEFF" + header + rows;
  } catch (error) {
    throw error;
  }
}

async function getSigns(filters = {}) {
  const { mabn = null, maba = null, makb = null } = filters;

  let sql = `
    SELECT 
      s.*,
      to_char(s.thoigianphatsinh, 'DD/MM/YYYY HH24:MI:SS') AS thoigianphatsinh_vn
    FROM badt_dhs.signs AS s
  `;

  const conds = [];
  const params = [];
  const addIfNotNull = (col, val) => {
    if (val !== null && val !== undefined) {
      params.push(val);
      conds.push(`${col} = $${params.length}`);
    }
  };

  addIfNotNull("s.mabn", mabn);
  addIfNotNull("s.maba", maba);
  addIfNotNull("s.makb", makb);

  if (conds.length > 0) sql += " WHERE " + conds.join(" AND ");

  // Chỉ sắp xếp theo thoigianphatsinh (có thể thêm NULLS LAST để an toàn)
  sql += " ORDER BY s.thoigianphatsinh DESC NULLS LAST";

  return await dbHelper.executePoolQuery(sql, params);
}

// Escape text cho XML Excel
function xmlEscape(s) {
  if (s === null || s === undefined) return "";
  const str = typeof s === "object" && !(s instanceof Date) ? JSON.stringify(s) : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build 1 sheet XML
function buildWorksheetXML(sheetName, fields, rows) {
  const safeFields = Array.isArray(fields) ? fields : [];
  const safeRows   = Array.isArray(rows)   ? rows   : [];

  // Lấy danh sách cột
  const columns = safeFields.length > 0
    ? safeFields.map(f => f.name)
    : (safeRows.length > 0 ? Object.keys(safeRows[0]) : []);

  // Nếu không có cột nào -> sheet rỗng
  if (columns.length === 0) {
    return `<Worksheet ss:Name="${xmlEscape(sheetName)}"><Table/></Worksheet>`;
  }

  // Header row
  const headerRow = `
    <Row>
      ${columns.map(c => `<Cell><Data ss:Type="String">${xmlEscape(c)}</Data></Cell>`).join("")}
    </Row>`;

  // Data rows
  const dataRows = safeRows.map(r => {
    const cells = columns.map(c => {
      let v = r[c];
      if (v instanceof Date) v = v.toISOString();
      else if (typeof v === "bigint") v = v.toString();
      return `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`;
    }).join("");
    return `<Row>${cells}</Row>`;
  }).join("");

  return `
    <Worksheet ss:Name="${xmlEscape(sheetName)}">
      <Table>
        ${headerRow}
        ${dataRows}
      </Table>
    </Worksheet>`;
}

// Build workbook XML (nhiều sheet)
function buildWorkbookXML(sheetsXML) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:html="http://www.w3.org/TR/REC-html40">
    ${sheetsXML}
  </Workbook>`;
}


// async function getLog(filters = {}) {
//   const { mabn = null, maba = null, makb = null } = filters;

//   let sql = `
//     SELECT 
//       s.*,
//       to_char(s.created_at, 'DD/MM/YYYY HH24:MI:SS') AS created_at_vn,
//       (d.holot || ' '|| d.ten) as hoten, b.madv, dv.tendv
//     FROM badt_dhs.benhnhan_synced AS s
//     LEFT JOIN current.dmbenhnhan AS d
//       ON d.mabn = s.mabn
//     LEFT JOIN current.bnnoitru AS b
//       ON b.mabn = s.mabn
//       AND b.maba = s.maba
//       AND b.makb = s.makb
//       LEFT JOIN current.dmdonvi AS dv
//       ON dv.madv = b.madv
//   `;
//   const conds = [];
//   const params = [];

//   const addIfNotNull = (col, val) => {
//     if (val !== null && val !== undefined) {
//       params.push(val);
//       conds.push(`${col} = $${params.length}`);
//     }
//   };
//   addIfNotNull("s.mabn", mabn);
//   addIfNotNull("s.maba", maba);
//   addIfNotNull("s.makb", makb);

//   if (conds.length > 0) sql += " WHERE " + conds.join(" AND ");

//   sql += " ORDER BY created_at DESC";

//   const result = await dbHelper.executePoolQuery(sql, params);

//   const csvCell = (val) => {
//     if (val === null || val === undefined) return "";
//     let s;
//     if (val instanceof Date) s = val.toISOString();
//     else if (typeof val === "bigint") s = val.toString();
//     else if (typeof val === "object") s = JSON.stringify(val);
//     else s = String(val);
//     const escaped = s.replace(/"/g, '""');
//     return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
//   };

//   const header = result.fields.map(f => f.name).join(",") + "\n";
//   const rows = result.rows
//     .map(row => result.fields.map(f => csvCell(row[f.name])).join(","))
//     .join("\n");
//   return "\uFEFF" + header + rows;
// }

async function getLog(filters = {}) {
  const { mabn = null, maba = null, makb = null } = filters;

  let sql = `
    SELECT 
      s.*,
      to_char(s.created_at, 'DD/MM/YYYY HH24:MI:SS') AS created_at_vn,
      (d.holot || ' '|| d.ten) as hoten, 
      b.madv, 
      dv.tendv
    FROM badt_dhs.benhnhan_synced AS s
    LEFT JOIN current.dmbenhnhan AS d ON d.mabn = s.mabn
    LEFT JOIN current.bnnoitru AS b
      ON b.mabn = s.mabn
      AND b.maba = s.maba
      AND b.makb = s.makb
    LEFT JOIN current.dmdonvi AS dv ON dv.madv = b.madv
  `;

  const conds = [];
  const params = [];

  const addIfNotNull = (col, val) => {
    if (val !== null && val !== undefined) {
      params.push(val);
      conds.push(`${col} = $${params.length}`);
    }
  };

  addIfNotNull("s.mabn", mabn);
  addIfNotNull("s.maba", maba);
  addIfNotNull("s.makb", makb);

  if (conds.length > 0) sql += " WHERE " + conds.join(" AND ");

  sql += " ORDER BY s.created_at DESC";

  // dbHelper.executePoolQuery thường trả về { rows, fields }
  return await dbHelper.executePoolQuery(sql, params);
}

async function getTableLog(filters = {}) {
  let { table = null, timelog = null } = filters;

  // Danh sách bảng được phép + cột ngày tương ứng
  const allowedTables = {
    "insert_log": "log_time",
    "notifications": "created_at",
    "received_data": "received_at"
  };

  if (!table || !allowedTables[table]) {
    throw new Error(`Bảng ${table} không được phép truy cập`);
  }

  // Nếu timelog rỗng => lấy ngày hiện tại (YYYY-MM-DD)
  if (!timelog || String(timelog).trim() === "") {
    timelog = new Date().toISOString().slice(0, 10);
  }

  // Cột thời gian cần so sánh
  const dateCol = allowedTables[table];

  // Query dữ liệu
  const sql = `
    SELECT s.*
    FROM badt_dhs.${table} AS s
    WHERE ${dateCol}::date = $1::date
    ORDER BY ${dateCol} DESC
  `;
  const params = [timelog];

  return await dbHelper.executePoolQuery(sql, params);
}

function stripDataUrlPrefix(str = "") {
  const m = str.match(/^data:(image\/\w+);base64,(.+)$/i);
  return m ? m[2] : str;
}

/**
 * Trích mọi IMAGE/IMAGE<n> trong body.
 * Trả về mảng [{ index, base64 }]
 *  - IMAGE1  -> index = 1
 *  - IMAGE   -> index = 0
 */
function extractImages(body = {}) {
  const out = [];
  for (const [key, val] of Object.entries(body)) {
    if (!/^IMAGE\d*$/i.test(key)) continue;
    if (typeof val !== "string" || !val.trim()) continue;

    const m = key.match(/^IMAGE(\d*)$/i);
    const index = m && m[1] ? parseInt(m[1], 10) : 0; // IMAGE -> 0, IMAGE5 -> 5
    const base64 = stripDataUrlPrefix(val.trim());

    // Không lưu buffer, chỉ trả index + base64
    out.push({ index, base64 });
  }
  out.sort((a, b) => a.index - b.index);
  return out;
}

function formatNgayChiDinh(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (m) return `${m[3]}${m[2]}${m[1]}_${m[4]}${m[5]}${m[6]}`;
  const d = new Date(String(s || "").replace(" ", "T"));
  const p = n => String(n).padStart(2, "0");
  return isNaN(d) ? "" : `${p(d.getDate())}${p(d.getMonth()+1)}${d.getFullYear()}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function getThamSo(tents) {
  const sql = `
    SELECT giatri
    FROM current.system
    WHERE tents = $1
    LIMIT 1
  `;
  const { rows } = await dbHelper.executePoolQuery(sql, [tents]);
  return rows?.[0]?.giatri ?? null;
}


module.exports = {
  dbHelper,
  executeQuery,
  callPgFunction,
  insertReceivedData,
  dropAndCreateFunctions,
  getCSV,
  getLog,
  getSigns,
  xmlEscape,
  buildWorksheetXML,
  buildWorkbookXML,
  getTableLog,
  formatNgayChiDinh,
  extractImages,
  getThamSo
};
