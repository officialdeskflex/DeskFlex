// WidgetManager.js
const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");
const { parseIni } = require("./IniLoader");
const {
  substituteVariables,
  safeInt,
  buildActionAttributes,
  escapeHtml,
  resolveIniPath,
  resolveKey,
} = require("./Utils");
const { renderTextWidget } = require("./TypeSections/TextType");
const { renderImageWidget } = require("./TypeSections/ImageType");
const getImageSize = require("./Helper/ImageSize");

const { init: initWidgetBangs, moveWidgetWindow } = require("./WidgetBangs");

// This map holds all BrowserWindows keyed by absolute INI path
const widgetWindows = new Map();

// Wire up widgetBangs to use our map
initWidgetBangs(widgetWindows);

// Expose API
module.exports = {
  loadWidget,
  unloadWidget,
  widgetWindows,
};

/**
 * Handle move requests from the renderer
 */
if (ipcMain && typeof ipcMain.on === "function") {
  ipcMain.on("widget-move-window", (_e, x, y, identifier) => {
    moveWidgetWindow(x, y, identifier);
  });
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

  // Normalize x/y/w/h/style keys
  for (const cfg of Object.values(sections)) {
    ["x", "y", "w", "h", "style"].forEach(k => {
      const low = k.toLowerCase(), up = k.toUpperCase();
      if (cfg[low] !== undefined && cfg[up] === undefined) {
        cfg[up] = cfg[low];
      }
    });
  }

  // Extract and delete Variables section
  const vars = sections.Variables || {};
  delete sections.Variables;

  // Style inheritance
  const usedStyles = new Set();
  for (const cfg of Object.values(sections)) {
    if (cfg.Style) {
      usedStyles.add(cfg.Style);
      const base = sections[cfg.Style];
      if (base) {
        ["X","Y","W","H","Width","Height"].forEach(k => {
          if (base[k] !== undefined && cfg[k] === undefined) {
            cfg[k] = base[k];
          }
        });
      } else {
        console.warn(`Style "${cfg.Style}" not found.`);
      }
    }
  }
  usedStyles.forEach(s => delete sections[s]);

  // Auto‑size images if needed
  const baseDir = path.dirname(iniPath);
  for (const cfg of Object.values(sections)) {
    if ((cfg.Type || "").trim().toLowerCase() === "image") {
      let img = (cfg.ImageName || "").replace(/"/g, "");
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

  // Compute window size
  const { width: winW, height: winH } = calculateWindowSize(sections);

  // Create & show window
  const win = createWidgetsWindow(iniPath, sections, vars, baseDir, winW, winH);
  widgetWindows.set(iniPath, win);
  console.log("widgetManager: stored window for", iniPath);
  return win;
}

function unloadWidget(identifier) {
  const key = resolveKey(widgetWindows, identifier);
  console.log("widgetManager: unloading", identifier, "→", key);
  if (key) {
    app.isWidgetQuiting = true;
    const win = widgetWindows.get(key);
    if (win) win.close();
    widgetWindows.delete(key);
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
      webSecurity: true,
    },
  });

  win.setTitle(name);
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body { margin:0; padding:0; background:transparent;
             width:${width}px; height:${height}px;
             overflow:hidden; position:relative;
             -webkit-app-region:drag; }
      .widget,*{ -webkit-app-region:no-drag }
    </style>
  </head><body>`;

  for (const raw of Object.values(secs)) {
    const cfg = {};
    for (const [k, vRaw] of Object.entries(raw)) {
      cfg[k] = typeof vRaw === "string"
        ? substituteVariables(vRaw, vars)
        : vRaw;
    }
    switch ((cfg.Type || "").trim()) {
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

  const actionsPath = path.join(__dirname, "WidgetActions.js").replace(/\\/g, "/");
  html += `<script>require('${actionsPath}')</script></body></html>`;

  win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(html),
    { baseURLForDataURL: "file://" + baseDir.replace(/\\/g, "/") + "/" }
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
