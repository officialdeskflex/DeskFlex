const { Tray, Menu, app } = require('electron');
const path = require('path');
const { clearAllLogs } = require("./Logs");

let tray = null;

function createTray(win) {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'DeskFlex.png'));
  tray.setToolTip('DeskFlex');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Manage',
      click: () => {
        win.show();
        win.focus();
      }
    },
    {
      label: 'Exit',
      click: () => {
        app.isQuiting = true;
        clearAllLogs();
        tray.destroy(); 
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
}

module.exports = { createTray };
