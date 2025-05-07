// widgetBangs.js
let widgetWindowsMap = null;

const { log, delay } = (() => {
  function log(msg) {
    console.log(msg);
  }
  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  return { log, delay };
})();

const { safeInt, resolveKey } = require("./Utils");

/**
 * Must be called once from WidgetManager to give us the shared Map.
 */
function init(map) {
  widgetWindowsMap = map;
}

/**
 * Move a widget window by identifier.
 * identifier may be bare section name or path.
 */
function moveWidgetWindow(x, y, identifier) {
  if (!widgetWindowsMap) return;
  const key = resolveKey(widgetWindowsMap, identifier);
  const win = widgetWindowsMap.get(key);
  if (win) {
    win.setPosition(safeInt(x, 0), safeInt(y, 0));
  }
}

module.exports = {
  log,
  delay,
  init,
  moveWidgetWindow,
};
