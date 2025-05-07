// WidgetManager.js
const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");
const { parseIni } = require("./IniLoader");
const {
  substituteVariables,
  safeInt,
  buildActionAttributes,
  escapeHtml,
} = require("./Utils");
const { renderTextWidget } = require("./TypeSections/TextType");
const { renderImageWidget } = require("./TypeSections/ImageType");
const getImageSize = require("./Helper/ImageSize");
const { getWidgetsPath } = require("./ConfigFile");

// Map to store widget windows keyed by normalized, absolute INI file path
const widgetWindows = new Map();

// Expose API
module.exports = {
  loadWidget,
  unloadWidget,
  moveWidgetWindow, 
};

// Listen for MoveWindow requests from renderer
ipcMain.on("widget-move-window", (event, x, y, identifier) => {
  moveWidgetWindow(x, y, identifier);
});

/**
 * Resolve a key in widgetWindows from either a section name or an INI path.
 */
function resolveKey(identifier) {
  if (!identifier.includes(path.sep) && !path.extname(identifier)) {
    for (const key of widgetWindows.keys()) {
      if (path.basename(key, ".ini").toLowerCase() === identifier.toLowerCase()) {
        return key;
      }
    }
    return undefined;
  }
  return resolveIniPath(identifier);
}

/**
 * Resolve an INI path to an absolute normalized path, defaulting to getWidgetsPath().
 */
function resolveIniPath(filePath) {
  const baseDir = getWidgetsPath();
  let absPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(baseDir, filePath);

  if (!path.extname(absPath)) {
    absPath += ".ini";
  }
  return path.normalize(path.resolve(absPath));
}

function loadWidget(filePath) {
  const iniPath = resolveIniPath(filePath);
  console.log("widgetManager: loading INI at", iniPath);

  let sections;
  try {
    sections = parseIni(iniPath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(iniPath)}:`, err);
    return;
  }

  // Normalize lowercase → uppercase keys
  for (const cfg of Object.values(sections)) {
    ["x","y","w","h","style"].forEach(k => {
      const low = k.toLowerCase(), up = k.toUpperCase();
      if (cfg[low] !== undefined && cfg[up] === undefined) {
        cfg[up] = cfg[low];
      }
    });
  }

  // Extract Variables
  const vars = sections.Variables || {};
  delete sections.Variables;

  // Style inheritance
  const usedStyles = new Set();
  for (const cfg of Object.values(sections)) {
    if (cfg.Style) {
      usedStyles.add(cfg.Style);
      const baseStyle = sections[cfg.Style];
      if (baseStyle) {
        ["X","Y","W","H","Width","Height"].forEach(k => {
          if (baseStyle[k] !== undefined && cfg[k] === undefined) {
            cfg[k] = baseStyle[k];
          }
        });
      } else {
        console.warn(`Style "${cfg.Style}" not found.`);
      }
    }
  }
  usedStyles.forEach(s => delete sections[s]);

  // Auto-size images
  const baseDir = path.dirname(iniPath);
  for (const cfg of Object.values(sections)) {
    if ((cfg.Type||"").trim().toLowerCase() === "image") {
      let img = (cfg.ImageName||"").replace(/"/g,"");
      if (!path.isAbsolute(img)) img = path.join(baseDir, img);
      const hasW = cfg.W || cfg.Width;
      const hasH = cfg.H || cfg.Height;
      if (!hasW || !hasH) {
        try {
          const sz = getImageSize(img);
          cfg.W = cfg.W || sz.width;
          cfg.H = cfg.H || sz.height;
        } catch (e) {
          console.warn(`Could not size ${img}:`, e);
        }
      }
    }
  }

  // Compute overall window size
  const { width: winW, height: winH } = calculateWindowSize(sections);

  // Create and store the window
  const win = createWidgetsWindow(iniPath, sections, vars, baseDir, winW, winH);
  widgetWindows.set(iniPath, win);
  console.log("widgetManager: stored window for", iniPath);
  return win;
}

function unloadWidget(identifier) {
  const key = resolveKey(identifier);
  console.log("widgetManager: unloading section", identifier, "->", key);
  if (key) {
    app.isWidgetQuiting = true;
    widgetWindows.get(key)?.close();
    widgetWindows.delete(key);
  }
}
/**
 * Move the widget window to (x, y) by section name or INI path.
 * Signature changed: (x, y, identifier)
 */
function moveWidgetWindow(x, y, identifier) {
  const key = resolveKey(identifier);
  const win = widgetWindows.get(key);
  if (win) {
    win.setPosition(safeInt(x, 0), safeInt(y, 0));
  }
}

function calculateWindowSize(secs) {
  let maxR = 0, maxB = 0;
  for (const cfg of Object.values(secs)) {
    const x = safeInt(cfg.X, 0), y = safeInt(cfg.Y, 0);
    const w = safeInt(cfg.Width ?? cfg.W, 0), h = safeInt(cfg.Height ?? cfg.H, 0);
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
      webSecurity: true
    }
  });

  win.setTitle(name);
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body {
        margin:0; padding:0;
        background:transparent;
        width:${width}px; height:${height}px;
        overflow:hidden; position:relative;
        -webkit-app-region:drag;
      }
      .widget,*{ -webkit-app-region:no-drag }
    </style>
  </head><body></body></html>`;

  for (const raw of Object.values(secs)) {
    const cfg = {};
    for (const [k,vRaw] of Object.entries(raw)) {
      cfg[k] = typeof vRaw === "string" ? substituteVariables(vRaw, vars) : vRaw;
    }
    switch ((cfg.Type||"").trim()) {
      case "Text":
        html += renderTextWidget(cfg);
        break;
      case "Image":
        html += renderImageWidget(cfg, baseDir);
        break;
      default:
        console.warn(`Skipping unknown Type="${cfg.Type}"`);
    }
  }

  const actionsPath = path.join(__dirname, "WidgetActions.js").replace(/\\/g,"/");
  html += `<script>require('${actionsPath}')</script>`;

  win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(html),
    { baseURLForDataURL: "file://" + baseDir.replace(/\\/g,"/") + "/" }
  );

  win.once("ready-to-show", () => win.show());
  win.on("close", e => {
    if (!app.isWidgetQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}
