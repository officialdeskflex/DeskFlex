const { ipcRenderer } = require("electron");

const { log, delay } = (() => {
  function log(msg,type,source) {
    ipcRenderer.send("log-message", msg, type, source);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return { log, delay };
})();

module.exports = { log, delay };