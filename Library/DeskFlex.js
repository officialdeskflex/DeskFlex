const { app, BrowserWindow } = require('electron');
const path = require('path');
const { getLogging, getDarkMode, getFlexesPath, getActiveFlex, getDebugging,getFolderStructure } = require('./ConfigFile');

const config = { logging: getLogging(), debugging: getDebugging(), darkMode: getDarkMode(), activeFlex: getActiveFlex(), flexesPath: getFlexesPath(),folderStructure:getFolderStructure() };

if (config.debugging) {
  console.log(`Debug Mode is Enabled.`);
  console.log(`Logging is ${config.logging ? 'Enabled' : 'Disabled'}.`);
  console.log(`DarkMode is ${config.darkMode ? 'Enabled' : 'Disabled'}.`);
  console.log('Active Flexes Found:', config.activeFlex);
 //console.log(JSON.stringify(config.folderStructure, null, 2));

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
 // win.setMenu(null);
  win.loadFile(path.join(__dirname, 'MainWindow', 'index.html'));
}

app.whenReady().then(createWindow);
