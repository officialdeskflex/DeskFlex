const { BrowserWindow,ipcMain } = require('electron');
const path = require('path');

function createLogsWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 450,
    resizable: false,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'DeskFlex.png'),
    webPreferences: {
      contextIsolation: true,   
      nodeIntegration: false,     
      sandbox: false,             
      preload: path.join(__dirname, 'preload.js'), 
    }
  });

  win.loadFile(path.join(__dirname, 'LogsWindow', 'index.html'));

  win.once('ready-to-show', () => {
      win.show();
  });

  return win;
}


module.exports = { createLogsWindow };
