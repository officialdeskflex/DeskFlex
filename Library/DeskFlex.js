const { app, BrowserWindow } = require('electron');
const path = require('path');
const { getLogging, getDarkMode,getFlexesPath } = require('./ConfigFile');

let Logging = getLogging();
let DarkMode = getDarkMode();

if (Logging === 1) {
  console.log('Logging is Enabled.');
} else {
  console.log('Logging is Disabled.');
}

if (DarkMode === 1) {
  console.log('DarkMode is Enabled.');
} else {
  console.log('DarkMode is Disabled.');
}

console.log(`Flexes Path is: ${getFlexesPath()}`)
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'MainWindow', 'index.html'));
}

app.whenReady().then(createWindow);
