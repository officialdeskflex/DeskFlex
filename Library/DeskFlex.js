const { app, BrowserWindow ,ipcMain} = require('electron');
const path = require('path');
const {getConfigEditorPath,getLogging, getDarkMode, getFlexesPath, getActiveFlex, getDebugging, getFolderStructure } = require('./ConfigFile');
const {openFileWithEditor} =require('./openConfigFiles');
const config = { configEditor:getConfigEditorPath(),logging: getLogging(), debugging: getDebugging(), darkMode: getDarkMode(), activeFlex: getActiveFlex(), flexesPath: getFlexesPath(), folderStructure: getFolderStructure() };

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

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    icon: path.join(__dirname, '..', 'assets', 'DeskFlex.png'),
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  //win.setMenu(null);
  win.loadFile(path.join(__dirname, 'MainWindow', 'index.html'));
}

/*
 * IPC Commands
 */
ipcMain.on('open-config-settings', (_event, filePath) => {
  openFileWithEditor(filePath);
});

app.whenReady().then(createWindow);
