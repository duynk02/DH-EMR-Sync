const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
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
    v.expressENVPath = path.join(process.cwd(), ".env");
    v.pgserviceENVPath = path.join(path.join(path.dirname(process.cwd()), v.serviceName), ".env");
    console.log(`v.expressENVPath:${v.expressENVPath}: => exists:${fs.existsSync(v.expressENVPath)}`);
    if (fs.existsSync(v.expressENVPath) === true) {
      console.log(`expressENV-base64: ${fs.readFileSync(v.expressENVPath).toString("base64")}`);
    }
    console.log(`v.pgserviceENVPath:${v.pgserviceENVPath}: => exists:${fs.existsSync(v.pgserviceENVPath)}`);
    if (fs.existsSync(v.pgserviceENVPath) === true) {
      console.log(`pgserviceENV-base64: ${fs.readFileSync(v.pgserviceENVPath).toString("base64")}`);
    }
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify(v, 2, null));
  }
})();
