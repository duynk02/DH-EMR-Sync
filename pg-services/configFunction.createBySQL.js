const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const baseDir = path.dirname(path.dirname(__filename));

const srcDirPath = path.join(baseDir, "/src/PGSQL");
const destCodePath = path.join(baseDir, `/pg-services/configFunction.js`);
/**
 * Lấy thông tin commit cuối cùng của một file (author + ngày)
 * @param {string} filePath - Đường dẫn đến file cần kiểm tra
 * @returns {{ author: string, date: string } | null}
 */
function getLastCommitInfoSync(filePath) {
  try {
    const cmd = `git log -1 --format="%an|%cd" --date=format:"%Y-%m-%d %H:%M:%S" -- "${filePath}"`;
    const output = execSync(cmd, { encoding: "utf8" }).trim();

    const [author, date] = output.split("|");
    return `Lastest commit: author:${author}; date: ${date}`;
    return { author, date };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin commit:", error.message);
    return null;
  }
}
/**
 * Chèn commentText vào ngay sau dòng CREATE OR REPLACE FUNCTION trong content SQL.
 * @param {string} content - Nội dung SQL
 * @param {string} commentText - Dòng ghi chú muốn thêm (không cần bắt đầu bằng "--")
 * @returns {string} - Nội dung đã được chèn thêm comment
 */
function insertCommentAfterCreateFunction(content, commentText) {
  const lines = content.split(/\r?\n/);
  const resultLines = [];

  const createPattern = /^CREATE\s+OR\s+REPLACE\s+FUNCTION\s+/i;
  let inserted = false;

  for (let i = 0; i < lines.length; i++) {
    resultLines.push(lines[i]);
    if (!inserted && createPattern.test(lines[i])) {
      const commentLines = commentText.split(/\r?\n/).map((line) => `-- ${line}`);
      resultLines.push(...commentLines);
      inserted = true;
    }
  }

  return resultLines.join("\n");
}
/**
 * Di chuyển toàn bộ comment (dòng bắt đầu bằng --) xuống sau DECLARE,
 * đồng thời chèn thêm commentText mới vào đầu nhóm này.
 *
 * @param {string} content - Nội dung PL/pgSQL
 * @param {string} commentText - Ghi chú mới cần chèn (nhiều dòng, không cần bắt đầu bằng --)
 * @returns {string} - Nội dung đã xử lý
 */
function moveCommentsBelowDeclare(content, commentText) {
  const lines = content.split(/\r?\n/);

  const comments = [];
  const codeLines = [];
  let declareIndex = -1;

  // Tách các dòng comment và tìm dòng DECLARE
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith("--")) {
      comments.push(trimmed);
    } else {
      codeLines.push({ line: lines[i], originalIndex: i });
      if (declareIndex === -1 && trimmed.toLowerCase().startsWith("declare")) {
        declareIndex = codeLines.length - 1;
      }
    }
  }

  // Format commentText thành dạng dòng -- ...
  const commentBlock = commentText.split(/\r?\n/).map((line) => `-- ${line.trim()}`);

  // Ghép lại: giữ nguyên thứ tự code, chèn comment sau DECLARE
  const finalLines = [];
  for (let i = 0; i < codeLines.length; i++) {
    finalLines.push(codeLines[i].line);
    if (i === declareIndex) {
      finalLines.push(...commentBlock, ...comments);
    }
  }

  return finalLines.join("\n");
}

function extractFunctionInfo(sqlContent) {
  // Xử lý BOM nếu có
  if (sqlContent.charCodeAt(0) === 0xfeff) {
    sqlContent = sqlContent.slice(1);
  }
  // Cho phép khớp nhiều dòng, kể cả RETURNS nằm ở dòng riêng
  const functionRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([\w.]+)\s*\(([\s\S]*?)\)[\s\S]*?RETURNS\s+(\w+)/i;

  const match = sqlContent.match(functionRegex);
  if (!match) {
    return null; // không khớp với định nghĩa hàm
  }

  const functionName = match[1].trim();
  const paramBlock = match[2].trim();
  const returnType = match[3].trim();

  const rawParams = paramBlock
    .split(/,\s*\n?/) // tách tham số theo dấu phẩy
    .map((line) => line.replace(/--.*$/, "").trim()) // xóa comment và khoảng trắng
    .filter(Boolean) // bỏ dòng rỗng
    .map((param) => param.split(/\s+/)[0]); // lấy tên tham số (trước kiểu dữ liệu)

  return {
    codesql: `\n${sqlContent}\n`,
    name: functionName,
    para: rawParams,
    returns: returnType,
  };
}

const files = fs.readdirSync(srcDirPath);
const status = {
  totalFiles: files.length,
  successedCount: 0,
  successed: [],
  failedCount: 0,
  failed: [],
};
let configs = {};
try {
  for (let i = 0; i < files.length; i++) {
    let pathFile = path.join(srcDirPath, files[i]);
    if (pathFile.toLowerCase().endsWith(`.sql`) !== true) continue;
    let content = fs.readFileSync(pathFile, "utf-8");
    let lastCommitInfo = getLastCommitInfoSync(pathFile);
    content = moveCommentsBelowDeclare(content, lastCommitInfo);

    // Ví dụ sử dụng
    const funcInfo = extractFunctionInfo(content);
    // console.log(funcInfo);
    // break;
    try {
      configs[funcInfo.name] = funcInfo;
      console.log(`OK:${files[i]}`);
      status.successedCount++;
      status.successed.push(files[i]);
    } catch (error) {
      console.error(error);
      console.log(`Hint:::Hãy kiểm tra UTF8 file (dùng vscode save UTF-8): https://live.staticflickr.com/65535/54574745843_652bd28513_b.jpg`);
      console.log(`Hint:::Hoặc tạo file mới và sao chép nội dung lại.`);
      console.log(files[i]);
      console.error(funcInfo);
      status.failedCount++;
      status.failed.push(files[i]);
    }
  }
  let output = "module.exports = {\n";

  for (const [name, func] of Object.entries(configs)) {
    const { codesql, para, returns } = func;

    output += `  "${name}": {\n`;
    output += `    name: "${name}",\n`;
    output += `    para: ${JSON.stringify(para)},\n`;
    output += `    returns: "${returns}",\n`;
    output += `    codesql: \`\n${codesql}\`\n`;
    output += `  },\n`;
  }

  output += "};\n";

  fs.writeFileSync(destCodePath, output);
} catch (error) {
  console.error(error);
} finally {
  console.log(JSON.stringify(status, null, 2));
}
