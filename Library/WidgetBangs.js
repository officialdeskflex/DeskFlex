// widgetBangs.js
const { ipcRenderer } = require("electron");
const { safeInt, resolveKey } = require("./Utils");

let widgetWindowsMap = null;

const { log, delay } = (() => {
  function log(msg,type,source) {
    ipcRenderer.send("log-message", msg, type, source);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return { log, delay };
})();

// Initialize widget windows map
function init(map) {
  widgetWindowsMap = map;
}

// Move widget window to specified position
function moveWidgetWindow(x, y, identifier) {
  if (!widgetWindowsMap) return;

  const key = resolveKey(widgetWindowsMap, identifier);
  const win = widgetWindowsMap.get(key);

  if (win) {
    win.setPosition(safeInt(x, 0), safeInt(y, 0));
  }
}

module.exports = { log, delay, init, moveWidgetWindow };