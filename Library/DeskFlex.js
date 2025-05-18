const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { createMainWindow } = require("./CreateMainWindow");
const { showStart, getConfigEditorPath, getLogging, getDarkMode, getWidgetsPath, getActiveWidgets, getDebugging, getFolderStructure } = require("./ConfigFile");
const { openFileWithEditor } = require("./OpenConfigFiles");
const { createTray } = require("./TrayIcon");
const { loadWidget, unloadWidget, widgetWindows, windowSizes } = require("./WidgetManager");
const { registerIpcHandlers } = require("./WidgetIpcHandlers");
const { createLogsWindow } = require("./CreateLogsWindow");
const { logs, getLogs,clearAllLogs } = require("./Logs");
const { runDeskFlexVersion } = require("./InitialLogs");
const config = { showStart: showStart(), configEditor: getConfigEditorPath(), logging: getLogging(), debugging: getDebugging(), darkMode: getDarkMode(), activeWidget: getActiveWidgets(), widgetsPath: getWidgetsPath(), folderStructure: getFolderStructure() };

let mainWindow;
app.isQuiting = false;

ipcMain.on("open-config-settings", (_event, filePath) => {
  openFileWithEditor(filePath);
});

ipcMain.on("hide-window", () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

app.whenReady().then(() => {
  mainWindow = createMainWindow(config);
  registerIpcHandlers(widgetWindows, windowSizes, loadWidget, unloadWidget, mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(config);
    }
  });

  ipcMain.handle("deskflex:createLogsWindow", () => {
    createLogsWindow();
  });
  runDeskFlexVersion();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("load-widget", async (_event, widgetName) => {
  console.log("Loading widget (DeskFlex):", widgetName);
  try {
    const fullPath = path.join(config.widgetsPath, widgetName);
    await loadWidget(fullPath);
    mainWindow.webContents.send("widget-status-changed", widgetName);
    return { success: true };
  } catch (err) {
    console.error("Error loading widget:", err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle("unload-widget", async (_event, widgetName) => {
  console.log("Unloading widget (DeskFlex):", widgetName);
  try {
    await unloadWidget(widgetName);
    mainWindow.webContents.send("widget-status-changed", widgetName);
    return { success: true };
  } catch (err) {
    console.error("Error unloading widget:", err);
    return { success: false, message: err.message };
  }
});

ipcMain.on("log-message", (_event, message, type, source) => {
  logs(message, type, source);
});

ipcMain.handle("get-logs", () => {
  return getLogs();
});

ipcMain.handle("clear-logs", () => {
  clearAllLogs();
});