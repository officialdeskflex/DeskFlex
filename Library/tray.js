// tray.js
const { Tray, Menu, app } = require('electron');
const path = require('path');

let tray = null;

function createTray(win) {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'DeskFlex.png'));
  tray.setToolTip('DeskFlex');

  // Context menu (right-click)
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
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  // Left-click toggles show/hide
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
