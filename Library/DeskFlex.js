const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { createMainWindow } = require("./CreateMainWindow");
const {
  showStart,
  getConfigEditorPath,
  getLogging,
  getDarkMode,
  getWidgetsPath,
  getActiveWidgets,
  getDebugging,
  getFolderStructure,
} = require("./ConfigFile");
const { openFileWithEditor } = require("./OpenConfigFiles");
const { createTray } = require("./TrayIcon");
const {
  loadWidget,
  unloadWidget,
} = require("./WidgetManager");
const { createLogsWindow } = require("./CreateLogsWindow");
const { logs, getLogs,clearAllLogs } = require("./Logs");
const { runDeskFlexVersion } = require("./InitialLogs");
const { console } = require("inspector");

let mainWindow;
app.isQuiting = false;

const config = {
  showStart: showStart(),
  configEditor: getConfigEditorPath(),
  logging: getLogging(),
  debugging: getDebugging(),
  darkMode: getDarkMode(),
  activeWidget: getActiveWidgets(),
  widgetsPath: getWidgetsPath(),
  folderStructure: getFolderStructure(),
};

/*if (config.debugging) {
  console.log(`Debug Mode is Enabled.`);
  console.log(`Logging is ${config.logging ? 'Enabled' : 'Disabled'}.`);
  console.log(`Dark Mode is ${config.darkMode ? 'Enabled' : 'Disabled'}.`);
  console.log('Settings File Path:', path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"));
  console.log('Active Widgets Found:', config.activeWidget);
  console.log('Config Editor Found:', config.configEditor);
  // console.log("Widgets Structure:", JSON.stringify(config.folderStructure, null, 2));
}*/

//console.log(`Widgets Path is: ${config.widgetsPath}`);

/*
 * IPC Commands
 */
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
  // const iniFilePath = 'C:\\Users\\nstec\\OneDrive\\Documents\\DeskFlex\\Widgets\\Test\\Test.ini';
  // loadWidget(iniFilePath);
  // const iniFolder = path.join(process.env.APPDATA, 'DeskFlex', 'Widgets');
  // loadWidgetsFromIniFolder(iniFolder);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("load-widget", async (_event, section) => {
  try {
    const fullPath = path.join(config.widgetsPath, section);
    loadWidget(fullPath);
    return { success: true };
  } catch (err) {
    console.error("Error loading widget:", err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle("unload-widget", async (_event, section) => {
  try {
    const sectionName = path.basename(section, ".ini");
    unloadWidget(sectionName);
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

