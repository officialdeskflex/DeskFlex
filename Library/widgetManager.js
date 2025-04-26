// widgetManager.js
const { BrowserWindow, app } = require('electron');
const fs   = require('fs');
const path = require('path');
const ini  = require('ini');

const {
  substituteVariables,
  parseActionList
} = require('./Utils');

const { renderTextWidget }  = require('./TextType');
const { renderImageWidget } = require('./ImageType');

module.exports = { loadWidgetsFromIniFolder };

function loadWidgetsFromIniFolder(folder) {
  console.log('▶️ Loading widget configs from:', folder);
  const files = fs
    .readdirSync(folder)
    .filter(f => f.toLowerCase().endsWith('.ini'));
  console.log('▶️ Found INI files:', files);

  files.forEach(file => {
    const fullPath  = path.join(folder, file);
    const contents  = fs.readFileSync(fullPath, 'utf-8');
    const sections  = ini.parse(contents);
    const variables = sections.Variables || {};
    delete sections.Variables;

    createWidgetsWindow(
      path.basename(file, '.ini'),
      sections,
      variables,
      folder
    );
  });
}

function createWidgetsWindow(windowName, sections, variables, baseDir) {
  const win = new BrowserWindow({
    width:  800,
    height: 600,
    frame:  false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,   // allow require() in the page
      webSecurity:    true
    }
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin:0; padding:0; background:transparent; position:relative; app-region:drag }
        .widget { app-region:no-drag }
      </style>
    </head>
    <body>
  `;

  // build each widget & parse *Action lists
  Object.values(sections).forEach(rawCfg => {
    const cfg = {};
    for (const [key, val] of Object.entries(rawCfg)) {
      const substituted = (typeof val === 'string')
        ? substituteVariables(val, variables)
        : val;
      if (key.endsWith('Action')) {
        cfg[key] = parseActionList(substituted);
      } else {
        cfg[key] = substituted;
      }
    }

    switch ((cfg.Type || '').trim()) {
      case 'Text':
        html += renderTextWidget(cfg);
        break;
      case 'Image':
        html += renderImageWidget(cfg, baseDir);
        break;
      default:
        console.warn(`Unknown widget Type="${cfg.Type}", skipping.`);
    }
  });

  // inject script to wire up all the mouse & scroll events
  html += `
    <script>
      const { exec } = require('child_process');
      const buttonMap = { 0:'Left', 1:'Middle', 2:'Right', 3:'X1', 4:'X2' };

      function runAction(el, key) {
        const data = el.dataset[key.toLowerCase()];
        if (!data) return;
        try {
          JSON.parse(data).forEach(cmd => exec(cmd));
        } catch (e) {
          console.error('Invalid action list for', key, e);
        }
      }

      document.querySelectorAll('.widget').forEach(el => {
        // disable default context menu
        el.addEventListener('contextmenu', e => e.preventDefault());

        // mouse down/up for each button
        el.addEventListener('mousedown', e => {
          const btn = buttonMap[e.button];
          if (btn) runAction(el, btn + 'MouseDownAction');
        });
        el.addEventListener('mouseup', e => {
          const btn = buttonMap[e.button];
          if (btn) runAction(el, btn + 'MouseUpAction');
        });

        // double-click
        el.addEventListener('dblclick', e => {
          const btn = buttonMap[e.button];
          if (btn) runAction(el, btn + 'MouseDoubleClickAction');
        });

        // hover
        el.addEventListener('mouseover', () => runAction(el, 'MouseOverAction'));
        el.addEventListener('mouseleave', () => runAction(el, 'MouseLeaveAction'));

        // scroll
        el.addEventListener('wheel', e => {
          if (e.deltaY > 0) runAction(el, 'MouseScrollDownAction');
          else if (e.deltaY < 0) runAction(el, 'MouseScrollUpAction');
          if (e.deltaX > 0) runAction(el, 'MouseScrollRightAction');
          else if (e.deltaX < 0) runAction(el, 'MouseScrollLeftAction');
        });
      });
    </script>
  `;

  html += `
    </body>
    </html>
  `;

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  const base    = 'file://' + baseDir.replace(/\\/g, '/') + '/';
  win.loadURL(dataUrl, { baseURLForDataURL: base });

  win.once('ready-to-show', () => win.show());
  win.on('close', e => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}
