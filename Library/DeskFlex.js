const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { createMainWindow } = require("./CreateMainWindow");
const { showStart, getConfigEditorPath, getLogging, getDarkMode, getWidgetsPath, getActiveWidgets, getDebugging, getFolderStructure } = require("./ConfigFile");
const { openFileWithEditor } = require("./OpenConfigFiles");
const { createTray } = require("./TrayIcon");
const { loadWidget, unloadWidget } = require("./WidgetManager");
const { createLogsWindow } = require("./CreateLogsWindow");
const { logs, getLogs,clearAllLogs } = require("./Logs");
const { runDeskFlexVersion } = require("./InitialLogs");
const { console } = require("inspector");

let mainWindow;
app.isQuiting = false;

const config = { showStart: showStart(), configEditor: getConfigEditorPath(), logging: getLogging(), debugging: getDebugging(), darkMode: getDarkMode(), activeWidget: getActiveWidgets(), widgetsPath: getWidgetsPath(), folderStructure: getFolderStructure() };

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
  createTray(mainWindow);

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
  try {
    const fullPath = path.join(config.widgetsPath, widgetName);
    loadWidget(fullPath);
    return { success: true };
  } catch (err) {
    console.error("Error loading widget:", err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle("unload-widget", async (_event, widgetName) => {
  try {
    const DFWidgetName = path.basename(widgetName, ".ini");
    unloadWidget(DFWidgetName);
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