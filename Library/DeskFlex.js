const { app, BrowserWindow } = require('electron');
const path = require('path');


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
