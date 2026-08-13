const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
// Hàm để restart dịch vụ
function restartService(service) {
  // Dừng dịch vụ
  exec(`net stop ${service}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error stopping service: ${stderr}`);
      return;
    }
    console.log(`Service ${service} stopped successfully.`);

    // Khởi động lại dịch vụ
    exec(`net start ${service}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting service: ${stderr}`);
        return;
      }
      console.log(`Service ${service} started successfully.`);
    });
  });
}
const ExecuteJSMain = (async () => {
  let v = {
    isRunOnDH: false,
    mabv: "",
  };
  try {
    v = await (async () => {
      const vInfo = {
        args: process.argv,
        pathJS: process.argv[1],
        pathRequestJson: "",
        RequestJson: {},
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
      if (v.mabv === "92007") return `dhpgemrdhs${v.mabv}`;
      return `ldhpgemrdhs${v.mabv}`;
    })();
    console.log(`v.serviceName:${v.serviceName}`);
    restartService(v.serviceName);
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify(v, 2, null));
  }
})();
