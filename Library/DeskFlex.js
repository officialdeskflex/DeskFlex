const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createMainWindow } = require('./createMainWindow');
const { showStart, getConfigEditorPath, getLogging, getDarkMode, getFlexesPath, getActiveFlex, getDebugging, getFolderStructure } = require('./configFile');
const { openFileWithEditor } = require('./openConfigFiles');
const { createTray } = require('./tray');

let mainWindow;
app.isQuiting = false;

const config = {
  showStart: showStart(),
  configEditor: getConfigEditorPath(),
  logging: getLogging(),
  debugging: getDebugging(),
  darkMode: getDarkMode(),
  activeFlex: getActiveFlex(),
  flexesPath: getFlexesPath(),
  folderStructure: getFolderStructure(),
};

if (config.debugging) {
  console.log(`Debug Mode is Enabled.`);
  console.log(`Logging is ${config.logging ? 'Enabled' : 'Disabled'}.`);
  console.log(`Dark Mode is ${config.darkMode ? 'Enabled' : 'Disabled'}.`);
  console.log('Settings File Path:', path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"));
  console.log('Active Flexes Found:', config.activeFlex);
  console.log('Config Editor Found:', config.configEditor);
  // console.log("Flexes Structure:", JSON.stringify(config.folderStructure, null, 2));
}

console.log(`Flexes Path is: ${config.flexesPath}`);

/*
 * IPC Commands
 */
ipcMain.on('open-config-settings', (_event, filePath) => {
  openFileWithEditor(filePath);
});

ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

app.whenReady().then(() => {
  mainWindow = createMainWindow(config);
  createTray(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(config);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});