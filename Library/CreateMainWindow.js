const { BrowserWindow, app } = require('electron');
const path = require('path');

function createMainWindow(config) {
  const win = new BrowserWindow({
    width: 800,
    height: 650,
    resizable: false,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'DeskFlex.png'),
    webPreferences: {
      nodeIntegration: true,
    //  enableRemoteModule: false,
    //  devTools: false, // only in production
      preload: path.join(__dirname, 'preload.js')
    }
  });

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

module.exports = { createMainWindow };
