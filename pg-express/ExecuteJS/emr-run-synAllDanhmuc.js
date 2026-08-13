const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
// Hàm để restart dịch vụ
function run_dhpgemrdhs(service, syncTable) {
  // Cập nhật đối tượng cấu hình với cwd
  const options = {
    cwd: path.join(path.dirname(process.cwd()), service), // Chỉ định thư mục làm việc
  };
  console.log(`${JSON.stringify(options, null, 2)}`);
  // Dừng dịch vụ
  exec(`node ./node_modules/${service}/index.js --syncAllDanhMuc ${syncTable}`, options, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error run_dhpgemrdhs: ${stderr}`);
      return;
    }
    console.log(`${stdout}`);
  });
}
const ExecuteJSMain = (async () => {
  let v = {
    isRunOnDH: false,
    mabv: "",
    cwd: process.cwd(),
  };
  try {
    v = await (async () => {
      const vInfo = {
        args: process.argv,
        pathJS: process.argv[1],
        pathRequestJson: "",
        RequestJson: {},
        cwd: process.cwd(),
      };
      vInfo.pathRequestJson = vInfo.pathJS.replace(".js", ".request.json");
      vInfo.RequestJson = JSON.parse(fs.readFileSync(vInfo.pathRequestJson, { encoding: "utf8" }));
      vInfo.hostname = vInfo.RequestJson?.hostname || "";
      vInfo.isRunOnDH = vInfo.hostname === "115.75.103.128";
      vInfo.mabv = vInfo.RequestJson?.params?.mabv || "";
      return vInfo;
    })();
    v.serviceName = (() => {
      if (v.isRunOnDH !== true) return `dhpgemrdhs${v.mabv}`;
      return `ldhpgemrdhs${v.mabv}`;
    })();
    v.syncTable = v.RequestJson?.query?.syncTable || "";
    console.log(`v.serviceName:${v.serviceName}: v.syncTable:${v.syncTable}`);
    if (v.syncTable === "") throw new Error(`Không tìm thấy query parma: syncTable`);
    run_dhpgemrdhs(v.serviceName, v.syncTable);
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify(v, 2, null));
  }
})();
