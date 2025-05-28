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

const registerIpcHandlers = (
  widgetWindows,
  windowSizes,
  loadWidget,
  unloadWidget,
  mainWindow
) => {
  if (handlersRegistered) return;

  if (!mainWindow) {
    //console.warn("Skipping handler registration: mainWindow is undefined");
    return;
  }

  handlersRegistered = true;
  widgetWindowsRef = widgetWindows;
  windowSizesRef = windowSizes;
  loadWidgetRef = loadWidget;
  unloadWidgetRef = unloadWidget;
  mainWindowRef = mainWindow;

  ipcMain.on("widget-set-opacity", (event, opacity) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setOpacity(opacity);
      mainWindowRef?.webContents?.send("widget-opacity-changed", {
        id: win.widgetId,
        value: opacity,
      });
    }
  });

  ipcMain.on("widget-set-ignore-mouse", (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, {
        forward: true,
      });
      mainWindowRef?.webContents?.send("widget-clickthrough-changed", {
        id: win.widgetId,
        value: Boolean(ignore),
      });
    }
  });

  ipcMain.handle("get-cursor-pos", () => {
    return screen.getCursorScreenPoint();
  });

  ipcMain.on("widget-move-window", (_e, initialX, initialY, id) => {
    //console.log(`Moved Window Called - Initial: X=${initialX}, Y=${initialY}, ID=${id}`);

    const key = resolveKey(widgetWindowsRef, id);
    if (!key) return false;

    const win = widgetWindowsRef.get(key);
    const size = windowSizesRef.get(key);
    if (!win || !size || !win.isWidgetDraggable) return false;

    let adjustedX = initialX;
    let adjustedY = initialY;

    if (win.keepOnScreen) {
      const disp = screen.getDisplayMatching({
        x: initialX,
        y: initialY,
        width: size.width,
        height: size.height,
      });
      const wa = disp.workArea;
      adjustedX = Math.max(
        wa.x,
        Math.min(initialX, wa.x + wa.width - size.width)
      );
      adjustedY = Math.max(
        wa.y,
        Math.min(initialY, wa.y + wa.height - size.height)
      );
    }

    win.setBounds({
      x: Math.round(adjustedX),
      y: Math.round(adjustedY),
      width: size.width,
      height: size.height,
    });

    setIniValue(id, "WindowX", `${adjustedX}`);
    setIniValue(id, "WindowY", `${adjustedY}`);

    mainWindowRef?.webContents?.send("widget-position-changed", {
      id,
      x: adjustedX,
      y: adjustedY,
    });

    ///console.log(`Moved Window - Adjusted: X=${adjustedX}, Y=${adjustedY}, ID=${id}`);

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

    mainWindowRef?.webContents?.send("widget-position-changed", { id, x, y });

    return true;
  });

  ipcMain.on("widget-save-window-position", (_e, identifier) => {
    const key = resolveKey(widgetWindowsRef, identifier);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return false;
    const { x, y } = win.getBounds();
    setIniValue(identifier, "WindowX", `${x}`);
    setIniValue(identifier, "WindowY", `${y}`);
    mainWindowRef?.webContents?.send("widget-position-saved", {
      id: identifier,
      x,
      y,
    });
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

  /**
   * Set the Behaviour of widget on Hover.
   * intValue may only 0,1,2 or 3.
   * 0 (Do Nothing - default) : No action is taken.
   * 1 (Hide) : Skin will fade between the value in TransparencyPercent and hidden.If no TransparencyPercent is defined, it will simply fade between fully visible and hidden.
   * 2 (Fade in) : Skin will fade between the value in TransparencyPercent and fully visible.
   * 3 (Fade out) : Skin will fade between the value in TransparencyPercent and hidden.
   *  widgetName e.g:Test\Test.ini.
   */

  ipcMain.on("widget-set-hoverType", (_e, intValue, widgetName) => {
    console.log(`Called ${intValue} ${widgetId}`);
    const key = resolveKey(widgetWindowsRef, widgetName);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const newType = Number(intValue);
    // persist in INI
    setIniValue(widgetName, "OnHover", intValue);
    // update our internal flag
    win.onHoverBehavior = newType;

    win.webContents.send("widget-set-hoverType", newType);
    mainWindowRef?.webContents?.send("widget-hoverType-changed", {
      id: widgetName,
      value: newType,
    });
  });

  /**
   * Set or Unset the widget from favourite list.
   * intValue may only 0 or 1.
   * widgetName e.g:Test\Test.ini.
   */

  ipcMain.on("widget-set-favourite", (_e, value, widgetName) => {
    setIniValue(widgetName, "Favorite", value);
    const favValue = Boolean(Number(value));
    mainWindowRef?.webContents?.send("widget-draggable-changed", {
      id: widgetName,
      value: favValue,
    });
  });

  /**
   * Enable or Disable the widget from being drag via mouse.
   * intValue may only 0 or 1.
   * widgetName e.g:Test\Test.ini.
   */

  ipcMain.on("widget-set-draggable", (_e, intValue, widgetName) => {
    const key = resolveKey(widgetWindowsRef, widgetName);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const draggable = Boolean(Number(intValue));
    win.isWidgetDraggable = draggable;
    setIniValue(widgetName, "Draggable", intValue);
    win.webContents.send("widget-draggable-changed", draggable);
    mainWindowRef?.webContents?.send("widget-draggable-changed", {
      id: widgetName,
      value: draggable,
    });
  });

  /**
   * Keep the widget on the screen rather than overflow the screen.
   * intValue may only 0 or 1.
   * widgetName e.g:Test\Test.ini.
   */

  ipcMain.on("widget-set-keep-on-screen", (_e, intValue, widgetName) => {
    const key = resolveKey(widgetWindowsRef, widgetName);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const keepOnScreen = Boolean(Number(intValue));
    win.keepOnScreen = keepOnScreen;
    setIniValue(widgetName, "KeepOnScreen", intValue);
    mainWindowRef?.webContents?.send("widget-keep-on-screen-changed", {
      id: widgetName,
      value: keepOnScreen,
    });
  });

  /**
   * Change the Transparency Value of widget.
   * percentValue in the format e.g:50%.Range from 0% to 100%.
   * widgetName e.g:Test\Test.ini.
   * Note:Tranparency 0% means that the widget is hidden and 100% means the widget is fully visible.
   */

  ipcMain.on("widget-set-transparency", (_e, paercentValue, widgetName) => {
    const key = resolveKey(widgetWindowsRef, widgetName);
    const win = key && widgetWindowsRef.get(key);
    if (!win) return;
    const pct = parseFloat(paercentValue);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      console.warn("Invalid transparency value:", paercentValue);
      return;
    }
    win.setOpacity(pct / 100);
    setIniValue(widgetName, "Transparency", paercentValue);

    mainWindowRef?.webContents?.send("widget-transparency-changed", {
      id: widgetName,
      value: pct,
    });
  });

  /**
   *  Change the Clickthrough of the widget.
   *  intValue may only 0 or 1.
   *  widgetName e.g:Test\Test.ini.
   */

  ipcMain.on("widget-set-clickthrough", (_e, intValue, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
    if (!win) return;
    const clickThrough = Boolean(Number(intValue));
    win.setIgnoreMouseEvents(clickThrough, {
      forward: true,
    });
    win.clickThrough = clickThrough;
    setIniValue(widgetName, "ClickThrough", intValue);

    mainWindowRef?.webContents?.send("widget-clickthrough-changed", {
      id: widgetName,
      value: clickThrough,
    });
  });

  ipcMain.handle("widget-load-widget", (_e, widgetName) => {
    const win = loadWidgetRef(widgetName);
    win &&
      mainWindowRef?.webContents?.send("widget-loaded", { name: widgetName });
    return !!win;
  });

  ipcMain.handle("widget-unload-widget", (_e, widgetName) => {
    unloadWidgetRef(widgetName);
    mainWindowRef?.webContents?.send("widget-unloaded", { name: widgetName });
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
    mainWindowRef?.webContents?.send("widget-toggled", {
      name: widgetName,
      value: newState,
    });
    return newState;
  });
};

module.exports = { registerIpcHandlers };
