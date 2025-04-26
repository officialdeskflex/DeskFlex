const { app, BrowserWindow ,ipcMain} = require('electron');
const path = require('path');
const {showStart,getConfigEditorPath,getLogging, getDarkMode, getFlexesPath, getActiveFlex, getDebugging, getFolderStructure } = require('./configFile');
const {openFileWithEditor} =require('./openConfigFiles');
const config = {showStart:showStart(), configEditor:getConfigEditorPath(),logging: getLogging(), debugging: getDebugging(), darkMode: getDarkMode(), activeFlex: getActiveFlex(), flexesPath: getFlexesPath(), folderStructure: getFolderStructure() };
const { createTray } = require('./tray');

if (config.debugging) {
  console.log(`Debug Mode is Enabled.`);
  console.log(`Logging is ${config.logging ? 'Enabled' : 'Disabled'}.`);
  console.log(`DarkMode is ${config.darkMode ? 'Enabled' : 'Disabled'}.`);
  console.log('Settings FilePath:' + path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"))
  console.log('Active Flexes Found:', config.activeFlex);
  console.log('ConfigEditor Found:', config.configEditor);
 // console.log("Flexes Structure:"+JSON.stringify(config.folderStructure, null, 2));
}

console.log(`Flexes Path is: ${config.flexesPath}`);

let mainWindow;
app.isQuiting = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    show: false, 
    icon: path.join(__dirname, '..', 'assets', 'DeskFlex.png'),
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  //win.setMenu(null);
  win.loadFile(path.join(__dirname, 'MainWindow', 'index.html'));
  win.once('ready-to-show', () => {
    if (config.showStart === 1) {
      win.show();
    }
  });
  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}

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
  mainWindow = createWindow();
  createTray(mainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});