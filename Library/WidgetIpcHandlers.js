// WidgetIpcHandlers.js
const { ipcMain, screen } = require("electron");
const path = require("path");
const { resolveKey,resolveIniPath } = require("./Utils");
const { getWidgetsPath,getWidgetStatus,setIniValue } = require("./ConfigFile");

let widgetWindowsRef;
let windowSizesRef;
let loadWidgetRef;
let unloadWidgetRef;

function registerIpcHandlers(widgetWindows, windowSizes, loadWidget, unloadWidget) {
  widgetWindowsRef = widgetWindows;
  windowSizesRef = windowSizes;
  loadWidgetRef = loadWidget;
  unloadWidgetRef = unloadWidget;

  ipcMain.on("widget-move-window", (_e, x, y, id) => {
    const key = resolveKey(widgetWindowsRef, id);
    if (!key) return false;
    const win = widgetWindowsRef.get(key);
    const size = windowSizesRef.get(key);
    if (!win || !size || !win.isWidgetDraggable) return false;

    if (win.keepOnScreen) {
      const disp = screen.getDisplayMatching({ x, y, width: size.width, height: size.height });
      const wa = disp.workArea;
      x = Math.max(wa.x, Math.min(x, wa.x + wa.width - size.width));
      y = Math.max(wa.y, Math.min(y, wa.y + wa.height - size.height));
    }

    win.setBounds({ x: Math.round(x), y: Math.round(y), width: size.width, height: size.height });
    return true;
  });

  ipcMain.handle("widget-get-position", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key) return { x: 0, y: 0 };
    const b = widgetWindowsRef.get(key).getBounds();
    return { x: b.x, y: b.y };
  });

  ipcMain.handle("widget-reset-size", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key) return false;
    const win = widgetWindowsRef.get(key);
    const originalSize = windowSizesRef.get(key);
    if (win && originalSize) {
      const { x, y } = win.getBounds();
      win.setBounds({ x, y, width: originalSize.width, height: originalSize.height });
      return true;
    }
    return false;
  });

  ipcMain.on("widget-set-draggable", (_e, rawVal, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key) return;
    const win = widgetWindowsRef.get(key);
    if (!win) return;
    win.isWidgetDraggable = Number(rawVal) === 1;
    win.webContents.send("widget-draggable-changed", win.isWidgetDraggable);
    setIniValue(identifier, "Draggable", rawVal);
  });

  ipcMain.on("widget-set-keep-on-screen", (_e, rawVal, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key) return;
    const win = widgetWindowsRef.get(key);
    if (!win) return;
    win.keepOnScreen = Number(rawVal) === 1;
    setIniValue(identifier, "KeepOnScreen", rawVal);
  });

  ipcMain.on("widget-set-transparency", (_e, rawPercent, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key) return;
    const win = widgetWindowsRef.get(key);
    if (!win) return;
    const pct = parseFloat(rawPercent);
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      win.setOpacity(pct / 100);
      console.log(`Set transparency of ${identifier} to ${pct}%`);
    } else {
      console.warn("Invalid transparency value:", rawPercent);
    }
  });

  ipcMain.on("widget-set-clickthrough", (_e, rawVal, identifier) => {
    console.log(`Set clickthrough of ${identifier} to ${rawVal}`);
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key) return;
    const win = widgetWindowsRef.get(key);
    if (!win) return;
    const ct = Number(rawVal) === 1;
    win.setIgnoreMouseEvents(ct, { forward: true });
    win.clickThrough = ct;
    setIniValue(identifier, "ClickThrough", rawVal);
  });

  ipcMain.handle("widget-get-draggable", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    return win ? Boolean(win.isWidgetDraggable) : false;
  });

  ipcMain.handle("widget-get-keep-on-screen", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    return win ? Boolean(win.keepOnScreen) : false;
  });

  ipcMain.handle("widget-get-clickthrough", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    return win ? Boolean(win.clickThrough) : false;
  });

  ipcMain.handle("widget-load-widget", (_e, widgetName) => {
    const win = loadWidgetRef(widgetName);
    return !!win;
  });

  ipcMain.handle("widget-unload-widget", (_e, widgetName) => {
    unloadWidgetRef(widgetName);
    return true;
  });

  ipcMain.handle("widget-is-widget-loaded", (_e, widgetName) => {
    const key = resolveKey(widgetWindowsRef, widgetName);
    return Boolean(key);
  });

  ipcMain.handle("widget-toggle-widget", (_e, widgetName) => {
  const L_WidgetName = resolveIniPath(path.join(getWidgetsPath(), widgetName));
  const UL_WidgetName = resolveKey(widgetWindowsRef, widgetName);
  const widgetStatus = getWidgetStatus(widgetName);

  if(widgetStatus==1){
    unloadWidgetRef(UL_WidgetName);
    return false;

  }else{
    loadWidgetRef(L_WidgetName);
    return true;
  }
});
}

module.exports = { registerIpcHandlers };