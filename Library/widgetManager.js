const { BrowserWindow, app } = require('electron');
const path = require('path');
const { parseIniWithImports } = require('./IniLoader');
const { substituteVariables, parseActionList, safeInt } = require('./Utils');
const { renderTextWidget } = require('./TextType');
const { renderImageWidget } = require('./ImageType');
const getImageSize = require('./Helper/ImageSize');

const widgetWindows = new Map();

module.exports = { loadWidgetsFromIniFile, unloadWidgetsBySection };

function loadWidgetsFromIniFile(filePath) {
  console.log('Loading widget config from:', filePath);

  // 1) Parse INI (with imports)
  let sections;
  try {
    sections = parseIniWithImports(filePath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(filePath)}:`, err);
    return;
  }

  // 2) Normalize case for the keys we care about
  for (const cfg of Object.values(sections)) {
    if (cfg.x !== undefined && cfg.X === undefined)         cfg.X = cfg.x;
    if (cfg.y !== undefined && cfg.Y === undefined)         cfg.Y = cfg.y;
    if (cfg.w !== undefined && cfg.W === undefined)         cfg.W = cfg.w;
    if (cfg.h !== undefined && cfg.H === undefined)         cfg.H = cfg.h;
    if (cfg.style  !== undefined && cfg.Style  === undefined) cfg.Style  = cfg.style;
  }

  // 3) Pull out any [Variables] section
  const variables = sections.Variables || {};
  delete sections.Variables;

  // 4) Merge in style defaults
  const usedStyles = new Set();
  for (const cfg of Object.values(sections)) {
    if (cfg.Style) {
      usedStyles.add(cfg.Style);
      const styleDef = sections[cfg.Style];
      if (styleDef) {
        // Only inherit X, Y, W, H, Width, Height
        ['X','Y','W','H','Width','Height'].forEach(k => {
          if (styleDef[k] !== undefined && cfg[k] === undefined) {
            cfg[k] = styleDef[k];
          }
        });
      } else {
        console.warn(`Style section "${cfg.Style}" not found.`);
      }
    }
  }
  // Drop the style sections themselves
  usedStyles.forEach(styleName => delete sections[styleName]);

  const windowName = path.basename(filePath, '.ini');
  const baseDir    = path.dirname(filePath);

  // 5) Auto-fill missing image sizes
  for (const cfg of Object.values(sections)) {
    if ((cfg.Type||'').trim() === 'Image') {
      let img = (cfg.ImageName||'').replace(/"/g,'');
      if (!path.isAbsolute(img)) img = path.join(baseDir, img);

      const hasW =  cfg.W;
      const hasH = cfg.Height || cfg.H;
      if (!hasW || !hasH) {
        try {
          const size = getImageSize(img);
          cfg.W = cfg.W || size.width;
          cfg.H = cfg.H || size.height;
        } catch (e) {
          console.warn(`Could not get size for ${img}:`, e);
        }
      }
    }
  }

  // 6) Compute overall window size
  const { width: winW, height: winH } = calculateWindowSize(sections);

  // 7) Build the BrowserWindow + HTML
  const win = createWidgetsWindow(windowName, sections, variables, baseDir, winW, winH);
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

function calculateWindowSize(secs) {
  let maxR = 0, maxB = 0;
  for (const cfg of Object.values(secs)) {
    const x = safeInt(cfg.X, 0);
    const y = safeInt(cfg.Y, 0);
    const w = safeInt(cfg.Width ?? cfg.W, 0);
    const h = safeInt(cfg.Height ?? cfg.H, 0);
    maxR = Math.max(maxR, x + w);
    maxB = Math.max(maxB, y + h);
  }
  return { width: maxR + 10, height: maxB + 10 };
}

function createWidgetsWindow(name, secs, vars, baseDir, width, height) {
  const win = new BrowserWindow({
    width, height,
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
    <html><head>
      <style>
        body { margin:0; padding:0; background:transparent;
               width:${width}px; height:${height}px;
               overflow:hidden; position:relative; app-region:drag; }
        .widget { position:absolute; app-region:drag; }
      </style>
    </head><body>
  `;

  Object.values(secs).forEach(rawCfg => {
    // substitute variables & parse actions
    const cfg = {};
    Object.entries(rawCfg).forEach(([k, v]) => {
      const val = (typeof v === 'string') ? substituteVariables(v, vars) : v;
      cfg[k] = k.endsWith('Action') ? parseActionList(val) : val;
    });

    // render it
    switch ((cfg.Type||'').trim()) {
      case 'Text':
        html += renderTextWidget(cfg);
        break;
      case 'Image':
        html += renderImageWidget(cfg, baseDir);
        break;
      default:
        console.warn(`Skipping unknown Type="${cfg.Type}"`);
    }
  });

  html += `</body></html>`;
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  const baseUrl = 'file://' + baseDir.replace(/\\\\/g, '/') + '/';
  win.loadURL(dataUrl, { baseURLForDataURL: baseUrl });

  win.once('ready-to-show', () => win.show());
  win.on('close', e => {
    if (!app.isWidgetQuiting) { e.preventDefault(); win.hide(); }
  });

  return win;
}
