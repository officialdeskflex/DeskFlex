// WidgetIpcHandlers.js
const { ipcMain, screen, BrowserWindow } = require("electron");
const path = require("path");
const { resolveKey, resolveIniPath } = require("./Utils");
const {
  getWidgetsPath,
  getWidgetStatus,
  setIniValue,
} = require("./ConfigFile");

let widgetWindowsRef;
let windowSizesRef;
let loadWidgetRef;
let unloadWidgetRef;
let mainWindowRef;
let handlersRegistered = false;

function registerIpcHandlers(
  widgetWindows,
  windowSizes,
  loadWidget,
  unloadWidget,
  mainWindow
) {
  if (handlersRegistered) return;
  if (!mainWindow) {
    console.warn("Skipping handler registration: mainWindow is undefined");
    return;
  }

  handlersRegistered = true;
  widgetWindowsRef = widgetWindows;
  windowSizesRef = windowSizes;
  loadWidgetRef = loadWidget;
  unloadWidgetRef = unloadWidget;
  mainWindowRef = mainWindow;

  // ------------------------------
  // Appearance & Mouse Behavior
  // ------------------------------

  ipcMain.on("widget-set-opacity", (event, opacity) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setOpacity(opacity);
      // Notify main window
      if (mainWindowRef?.webContents) {
        mainWindowRef.webContents.send("widget-opacity-changed", {
          id: win.widgetId,
          value: opacity,
        });
      }
    }
  });

  ipcMain.on("widget-set-ignore-mouse", (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, {
        forward: true,
      });
      if (mainWindowRef?.webContents) {
        mainWindowRef.webContents.send("widget-clickthrough-changed", {
          id: win.widgetId,
          value: Boolean(ignore),
        });
      }
    }
  });

  // ------------------------------
  // Position & Size
  // ------------------------------

  ipcMain.handle("get-cursor-pos", () => {
    return screen.getCursorScreenPoint();
  });

  ipcMain.on("widget-move-window", (_e, x, y, id) => {
    console.log("Moved Window Called");

    const key = resolveKey(widgetWindowsRef, id);
    if (!key) return false;

    const win = widgetWindowsRef.get(key);
    const size = windowSizesRef.get(key);
    if (!win || !size || !win.isWidgetDraggable) return false;

    if (win.keepOnScreen) {
      const disp = screen.getDisplayMatching({
        x,
        y,
        width: size.width,
        height: size.height,
      });
      const wa = disp.workArea;
      x = Math.max(wa.x, Math.min(x, wa.x + wa.width - size.width));
      y = Math.max(wa.y, Math.min(y, wa.y + wa.height - size.height));
    }

    win.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: size.width,
      height: size.height,
    });

    setIniValue(id, "WindowX", `${x}`);
    setIniValue(id, "WindowY", `${y}`);

    if (mainWindowRef && mainWindowRef.webContents) {
      mainWindowRef.webContents.send("widget-position-changed", {
        id,
        x,
        y,
      });
    }

    return true;
  });

  ipcMain.on("widget-move-window-drag", (_e, x, y, id) => {
    const key = resolveKey(widgetWindowsRef, id);
    if (!key) return false;

    const win = widgetWindowsRef.get(key);
    const size = windowSizesRef.get(key);
    if (!win || !size || !win.isWidgetDraggable) return false;

    if (win.keepOnScreen) {
      const disp = screen.getDisplayMatching({
        x,
        y,
        width: size.width,
        height: size.height,
      });
      const wa = disp.workArea;
      x = Math.max(wa.x, Math.min(x, wa.x + wa.width - size.width));
      y = Math.max(wa.y, Math.min(y, wa.y + wa.height - size.height));
    }

    win.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: size.width,
      height: size.height,
    });

    return true;
  });

  ipcMain.on("widget-save-window-position", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return false;
    const { x, y } = win.getBounds();
    setIniValue(identifier, "WindowX", `${x}`);
    setIniValue(identifier, "WindowY", `${y}`);
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-position-saved", {
        id: identifier,
        x,
        y,
      });
    }
    console.Consolelo
    return true;
  });

  ipcMain.handle("widget-get-position", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    if (!key)
      return {
        x: 0,
        y: 0,
      };
    const b = widgetWindowsRef.get(key).getBounds();
    return {
      x: b.x,
      y: b.y,
    };
  });

  ipcMain.handle("widget-reset-size", (_e, identifier) => {
  const key = resolveKey(widgetWindowsRef, identifier);
  const win = key && widgetWindowsRef.get(key);
  const originalSize = key && windowSizesRef.get(key);
  if (win && originalSize) {
    const { x, y } = win.getBounds();
    win.setBounds({
      x,
      y,
      width: originalSize.width,
      height: originalSize.height,
    });
    return true;
  }
  return false;
});

  // ------------------------------
  // Behavior Toggles
  // ------------------------------

  ipcMain.on("widget-set-draggable", (_e, rawVal, identifier) => {
    console.log(`IpC Called:${rawVal} || ${identifier}`)
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const draggable = Boolean(Number(rawVal));
    console.log(`Boolean:${draggable}`)
    win.isWidgetDraggable = draggable;

    setIniValue(identifier, "Draggable", rawVal);

    win.webContents.send("widget-draggable-changed", draggable);
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-draggable-changed", {
        id: identifier,
        value: draggable,
      });
    }
  });

  ipcMain.on("widget-set-keep-on-screen", (_e, rawVal, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const keepOnScreen = Boolean(Number(rawVal));
    win.keepOnScreen = keepOnScreen;
    setIniValue(identifier, "KeepOnScreen", rawVal);

    // Notify main window
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-keep-on-screen-changed", {
        id: identifier,
        value: keepOnScreen,
      });
    }
  });

  ipcMain.on("widget-set-transparency", (_e, rawPercent, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const pct = parseFloat(rawPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      console.warn("Invalid transparency value:", rawPercent);
      return;
    }
    win.setOpacity(pct / 100);
    setIniValue(identifier, "Transparency", rawPercent);

    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-transparency-changed", {
        id: identifier,
        value: pct,
      });
    }
  });

  ipcMain.on("widget-set-clickthrough", (_e, rawVal, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const clickThrough = Boolean(Number(rawVal));
    win.setIgnoreMouseEvents(clickThrough, {
      forward: true,
    });
    win.clickThrough = clickThrough;
    setIniValue(identifier, "ClickThrough", rawVal);

    // Notify main window
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-clickthrough-changed", {
        id: identifier,
        value: clickThrough,
      });
    }
  });

  // ------------------------------
  // Load / Unload / Toggle
  // ------------------------------

  ipcMain.handle("widget-load-widget", (_e, widgetName) => {
    const win = loadWidgetRef(widgetName);
    if (win && mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-loaded", {
        name: widgetName,
      });
    }
    return !!win;
  });

  ipcMain.handle("widget-unload-widget", (_e, widgetName) => {
    unloadWidgetRef(widgetName);
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-unloaded", {
        name: widgetName,
      });
    }
    return true;
  });

  ipcMain.handle("widget-is-widget-loaded", (_e, widgetName) => {
    const key = resolveKey(widgetWindowsRef, widgetName);
    return Boolean(key);
  });

  ipcMain.handle("widget-toggle-widget", (_e, widgetName) => {
    const iniPath = resolveIniPath(path.join(getWidgetsPath(), widgetName));
    const key = resolveKey(widgetWindowsRef, widgetName);
    const status = getWidgetStatus(widgetName);

    let newState;
    if (status === 1) {
      unloadWidgetRef(key);
      newState = false;
    } else {
      loadWidgetRef(iniPath);
      newState = true;
    }

    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send("widget-toggled", {
        name: widgetName,
        value: newState,
      });
    }
    return newState;
  });
}

module.exports = {
  registerIpcHandlers,
};
