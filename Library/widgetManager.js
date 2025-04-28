const { BrowserWindow, app } = require('electron');
const path = require('path');
const { parseIniWithImports } = require('./IniLoader');
const { substituteVariables, parseActionList } = require('./Utils');
const { renderTextWidget } = require('./TextType');
const { renderImageWidget } = require('./ImageType');

const widgetWindows = new Map();

module.exports = { loadWidgetsFromIniFile, unloadWidgetsBySection };

function loadWidgetsFromIniFile(filePath) {
  console.log('Loading widget config from:', filePath);

  let sections;
  try {
    sections = parseIniWithImports(filePath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(filePath)}:`, err);
    return;
  }

  const variables = sections.Variables || {};
  delete sections.Variables;

  // Use the file base name (without .ini) as the window key
  const windowName = path.basename(filePath, '.ini');
  const baseDir    = path.dirname(filePath);

  // Create the BrowserWindow for this widget
  const win = createWidgetsWindow(windowName, sections, variables, baseDir);

  // Store it in the registry
  widgetWindows.set(windowName, win);

  return win;
}

function unloadWidgetsBySection(sectionName) {
  const win = widgetWindows.get(sectionName);
  if (win) {
    app.isQuiting = true;
    win.close();
    widgetWindows.delete(sectionName);
  }
}

function createWidgetsWindow(windowName, sections, variables, baseDir) {
  const win = new BrowserWindow({
    width:       800,
    height:      600,
    frame:       false,
    transparent: true,
    alwaysOnTop: true,
    resizable:   false,
    hasShadow:   false,
    show:        false,
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
      webSecurity:      true,
      preload:          path.join(__dirname, 'widgetActions.js')
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
