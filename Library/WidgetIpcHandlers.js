// WidgetIpcHandlers.js
const { ipcMain, screen, BrowserWindow } = require("electron");
const path = require("path");
const { resolveKey, resolveIniPath } = require("./Utils");
const { updateWindowPosition } = require("./Helper/PositionHandler");
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
    return;
  }

  handlersRegistered = true;
  widgetWindowsRef = widgetWindows;
  windowSizesRef = windowSizes;
  loadWidgetRef = loadWidget;
  unloadWidgetRef = unloadWidget;
  mainWindowRef = mainWindow;

  /**
   * Sets the z-order position of a widget window.
   */

  ipcMain.on("widget-set-zpos", (_e, newPos, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    console.log(`Received IPC ${newPos},${widgetName}`);
    const win = widgetWindowsRef.get(widgetKey);
    if (!win) return;

    updateWindowPosition(Number(newPos), widgetName, win);

    mainWindowRef?.webContents?.send("widget-zpos-changed", {
      widget: widgetName,
      value: newPos,
    });

    setIniValue(widgetName, "Position", `${newPos}`);
  });

  /**
   * Moves the widget window to the new (x, y) coordinates while dragging.
   * Applies screen bounds constraints if 'keepOnScreen' is enabled.
   */

  ipcMain.on("widget-move-window", (_e, initialX, initialY, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    if (!widgetKey) return false;

    const win = widgetWindowsRef.get(widgetKey);
    const size = windowSizesRef.get(widgetKey);
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

    setIniValue(widgetName, "WindowX", `${adjustedX}`);
    setIniValue(widgetName, "WindowY", `${adjustedY}`);

    mainWindowRef?.webContents?.send("widget-position-changed", {
      id: widgetName,
      x: adjustedX,
      y: adjustedY,
    });

    return true;
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
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
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
   * IPC helper for the OnHover action.
   * When the mouse hovers over the widget, this sets its opacity (transparency).
   * The opacity value ranges from 0 (fully transparent) to 1 (fully opaque).
   */

  ipcMain.on("widget-set-opacity", (event, opacityValue) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setOpacity(opacityValue);
      mainWindowRef?.webContents?.send("widget-opacity-changed", {
        id: win.widgetId,
        value: opacityValue,
      });
    }
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
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
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
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
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

  ipcMain.on("widget-set-transparency", (_e, percentValue, widgetName) => {
    console.log(`Setting new transparency:${percentValue}`);
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
    if (!win) return;
    const pct = parseFloat(percentValue);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      console.warn("Invalid transparency value:", percentValue);
      return;
    }
    win.setOpacity(pct / 100);
    setIniValue(widgetName, "Transparency", percentValue);

    win.webContents.send("widget-transparency-changed", pct);
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

  /**
   *  Loads a widget by name and notifies the main window.
   */

  ipcMain.handle("widget-load-widget", (_e, widgetName) => {
    const win = loadWidgetRef(widgetName);
    win &&
      mainWindowRef?.webContents?.send("widget-loaded", { name: widgetName });
    return !!win;
  });

  /**
   * Unloads a widget by name and notifies the main window.
   */

  ipcMain.handle("widget-unload-widget", (_e, widgetName) => {
    unloadWidgetRef(widgetName);
    mainWindowRef?.webContents?.send("widget-unloaded", { name: widgetName });
    return true;
  });

  /**
   * Checks whether a widget is currently loaded.
   */

  ipcMain.handle("widget-is-widget-loaded", (_e, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    return Boolean(widgetKey);
  });

  /**
   * Toggles the loaded state of a widget.
   * Loads it if it's not loaded, unloads it if it is.
   * Notifies the main window of the new state.
   *
   */
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

  //====================================================================================//
  //        IPC MAINLY USED IN HOVERHELPER.JS FOR DRAGGING WIDGET FUNCTIONALITY         //
  //====================================================================================//

  /**
   * Sets whether the widget window should ignore mouse events.
   * This allows the window to become "click-through" when transparent.
   */

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

  /**
   * Returns the current cursor position on screen.
   * Used by widgets to determine whether the cursor is hovering over them.
   */

  ipcMain.handle("get-cursor-pos", () => {
    return screen.getCursorScreenPoint();
  });

  //====================================================================================//
  //        IPC MAINLY USED IN WIDGETDRAG.JS FOR DRAGGING WIDGET FUNCTIONALITY         //
  //====================================================================================//

  /**
   * Returns the current position (x, y) of the widget window.
   * Used to store the original position before dragging starts.
   */

  ipcMain.handle("widget-get-position", (_e, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    if (!widgetKey)
      return {
        x: 0,
        y: 0,
      };
    const b = widgetWindowsRef.get(widgetKey).getBounds();
    return {
      x: b.x,
      y: b.y,
    };
  });

  /**
   * Resets the widget window to its original size based on saved dimensions.
   * Avoids size drift due to user resizing or system behavior.
   */

  ipcMain.handle("widget-reset-size", (_e, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
    const originalSize = widgetKey && windowSizesRef.get(widgetKey);
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
   * Moves the widget window to the new (x, y) coordinates while dragging.
   * Applies screen bounds constraints if 'keepOnScreen' is enabled.
   */

  ipcMain.on("widget-move-window-drag", (_e, x, y, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    if (!widgetKey) return false;

    const win = widgetWindowsRef.get(widgetKey);
    const size = windowSizesRef.get(widgetKey);
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

    mainWindowRef?.webContents?.send("widget-position-changed", {
      id: widgetName,
      x,
      y,
    });

    return true;
  });

  /**
   * Saves the final position of the widget window after dragging ends.
   * Persists (x, y) into DeskFlex.ini file for restoration later.
   */

  ipcMain.on("widget-save-window-position", (_e, widgetName) => {
    const widgetKey = resolveKey(widgetWindowsRef, widgetName);
    const win = widgetKey && widgetWindowsRef.get(widgetKey);
    if (!win) return false;
    const { x, y } = win.getBounds();
    setIniValue(widgetName, "WindowX", `${x}`);
    setIniValue(widgetName, "WindowY", `${y}`);
    mainWindowRef?.webContents?.send("widget-position-saved", {
      id: widgetName,
      x,
      y,
    });
    return true;
  });
};

module.exports = { registerIpcHandlers };
