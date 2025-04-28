const { BrowserWindow, app } = require('electron');
const path = require('path');
const { parseIniWithImports } = require('./IniLoader');
const { substituteVariables, parseActionList, safeInt } = require('./Utils');
const { renderTextWidget } = require('./TextType');
const { renderImageWidget } = require('./ImageType');
// Import the default export or function directly, not via destructuring
const getImageSize = require('./Helper/ImageSize');

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
  const windowName = path.basename(filePath, '.ini');
  const baseDir = path.dirname(filePath);

  // Preprocess image widgets to fill missing sizes
  for (const rawCfg of Object.values(sections)) {
    if ((rawCfg.Type || '').trim() === 'Image') {
      const imgRaw = rawCfg.ImageName || '';
      let imgPath = imgRaw.replace(/"/g, '');
      if (!path.isAbsolute(imgPath)) {
        imgPath = path.join(baseDir, imgPath);
      }
      // Only fetch size if width/height unset
      const hasWidth = rawCfg.Width || rawCfg.W;
      const hasHeight = rawCfg.Height || rawCfg.H;
      if (!hasWidth || !hasHeight) {
        try {
          const size = getImageSize(imgPath);
          rawCfg.W = rawCfg.W || size.width;
          rawCfg.H = rawCfg.H || size.height;
        } catch (err) {
          console.warn(`Unable to get image size for ${imgPath}:`, err);
        }
      }
    }
  }

  // Compute window size based on widgets
  const { width: winWidth, height: winHeight } = calculateWindowSize(sections);

  const win = createWidgetsWindow(windowName, sections, variables, baseDir, winWidth, winHeight);
  widgetWindows.set(windowName, win);

  return win;
}

function unloadWidgetsBySection(sectionName) {
  const win = widgetWindows.get(sectionName);
  if (win) {
    app.isWidgetQuiting = true;
    win.close();
    widgetWindows.delete(sectionName);
  }
}

function calculateWindowSize(sections) {
  let maxRight = 0;
  let maxBottom = 0;
  for (const rawCfg of Object.values(sections)) {
    const x = safeInt(rawCfg.X, 0);
    const y = safeInt(rawCfg.Y, 0);
    const w = safeInt(rawCfg.Width ?? rawCfg.W, 0);
    const h = safeInt(rawCfg.Height ?? rawCfg.H, 0);
    maxRight = Math.max(maxRight, x + w);
    maxBottom = Math.max(maxBottom, y + h);
  }
  // Add small padding
  return { width: maxRight + 10, height: maxBottom + 10 };
}

function createWidgetsWindow(windowName, sections, variables, baseDir, width, height) {
  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      preload: path.join(__dirname, 'widgetActions.js')
    }
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin:0; padding:0; background:transparent; position:relative; width:${width}px; height:${height}px; overflow:hidden; app-region:drag}
        .widget { position:absolute; app-region:drag}
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
  const base = 'file://' + baseDir.replace(/\\/g, '/') + '/';
  win.loadURL(dataUrl, { baseURLForDataURL: base });

  win.once('ready-to-show', () => win.show());
  win.on('close', e => {
    if (!app.isWidgetQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}
