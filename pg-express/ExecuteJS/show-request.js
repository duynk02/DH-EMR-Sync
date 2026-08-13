const fs = require("fs");
const path = require("path");
const executeMain = (async () => {
  let v = {
    isRunOnDH: false,
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
      v.isRunOnDH = vInfo.hostname === "115.75.103.128";
      return vInfo;
    })();
    console.log(JSON.stringify(v, null, 2));
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify(v, 2, null));
  }
})();
