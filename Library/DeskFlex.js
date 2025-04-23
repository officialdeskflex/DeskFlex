const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration(); // Strongly recommended to avoid glass rendering

function createWindow() {
  const win = new BrowserWindow({
    width: 300,
    height: 100,
    frame: false,
    transparent: true,
    vibrancy: null,             // <- Make sure NO vibrancy is set
    backgroundMaterial: 'none', // <- Prevents Mica/Acrylic fallback
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.setBackgroundColor('#00000000');
  win.loadFile(path.join(__dirname, 'MainWindow', 'index.html'));
  win.setIgnoreMouseEvents(true); // Widget-like
}

app.whenReady().then(createWindow);
