// WidgetManager.js
const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");
const { parseIni } = require("./IniLoader");
const {
  substituteVariables,
  safeInt,
  escapeHtml,
  resolveIniPath,
  resolveKey,
} = require("./Utils");
const { renderTextWidget } = require("./TypeSections/TextType");
const { renderImageWidget } = require("./TypeSections/ImageType");
const getImageSize = require("./Helper/ImageSize");
const {
  getWidgetClickthrough,
  getWidgetWindowX,
  getWidgetWindowY,
  getWidgetDraggable,
  getWidgetSnapEdges,
  getWidgetTransparency,
  getWidgetOnHover,
  getWidgetsPath,
} = require("./ConfigFile");
const { init: initWidgetBangs, moveWidgetWindow } = require("./WidgetBangs");

const widgetWindows = new Map();
const windowSizes   = new Map();

initWidgetBangs(widgetWindows);

module.exports = {
  loadWidget,
  unloadWidget,
  widgetWindows,
};

function moveWidgetWindowSafely(x, y, identifier) {
  const key = resolveKey(widgetWindows, identifier);
  if (!key) return false;
  const win = widgetWindows.get(key);
  if (!win) return false;
  const originalSize = windowSizes.get(key);
  if (!originalSize) return false;

  win.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: originalSize.width,
    height: originalSize.height,
  });
  return true;
}

ipcMain.on("widget-move-window", (_e, x, y, identifier) => {
  if (!moveWidgetWindowSafely(x, y, identifier)) {
    moveWidgetWindow(x, y, identifier);
  }
});

ipcMain.handle("widget-get-position", (_e, identifier) => {
  const key = resolveKey(widgetWindows, identifier);
  if (!key) return { x: 0, y: 0 };
  const win = widgetWindows.get(key);
  const b = win.getBounds();
  return { x: b.x, y: b.y };
});

ipcMain.handle("widget-reset-size", (_e, identifier) => {
  const key = resolveKey(widgetWindows, identifier);
  if (!key) return false;
  const win = widgetWindows.get(key);
  const originalSize = windowSizes.get(key);
  if (win && originalSize) {
    const { x, y } = win.getBounds();
    win.setBounds({ x, y, width: originalSize.width, height: originalSize.height });
    return true;
  }
  return false;
});

// --- New: handle transparency changes ---
ipcMain.on("widget-set-transparency", (_e, rawPercent, identifier) => {
  const key = resolveKey(widgetWindows, identifier);
  if (!key) return;
  const win = widgetWindows.get(key);
  if (!win) return;

  const pct = parseFloat(rawPercent);
  if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
    win.setOpacity(pct / 100);
    console.log(`Set transparency of ${identifier} to ${pct}%`);
  } else {
    console.warn("Invalid transparency value:", rawPercent);
  }
});

function loadWidget(filePath) {
  const iniPath = resolveIniPath(filePath);
  console.log("widgetManager: loading INI at", iniPath);

  const widgetsBase = getWidgetsPath();
  const sectionName = path.relative(widgetsBase, iniPath).replace(/\[/g, "\\");

  const clickVal            = Number(getWidgetClickthrough(sectionName)) === 1 ? 1 : 0;
  const winX                = safeInt(getWidgetWindowX(sectionName), null);
  const winY                = safeInt(getWidgetWindowY(sectionName), null);
  const draggable           = Number(getWidgetDraggable(sectionName)) === 1;
  const snapEdges           = getWidgetSnapEdges(sectionName) || "";
  const transparencyPercent = safeInt(getWidgetTransparency(sectionName), 100);
  const onHover             = Number(getWidgetOnHover(sectionName)) || 0;

  let sections;
  try {
    sections = parseIni(iniPath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(iniPath)}:`, err);
    return;
  }

  // normalize cfg keys
  for (const cfg of Object.values(sections)) {
    ["x", "y", "w", "h", "style"].forEach(k => {
      const low = k.toLowerCase(), up = k.toUpperCase();
      if (cfg[low] !== undefined && cfg[up] === undefined) {
        cfg[up] = cfg[low];
      }
    });
  }

  // extract Variables
  const vars = sections.Variables || {};
  delete sections.Variables;

  // style inheritance
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

  // auto‐size images
  const baseDir = path.dirname(iniPath);
  for (const cfg of Object.values(sections)) {
    if ((cfg.Type||"").trim().toLowerCase() === "image") {
      let img = (cfg.ImageName||"").replace(/"/g,"");
      if (!path.isAbsolute(img)) img = path.join(baseDir, img);
      const hasW = cfg.W || cfg.Width, hasH = cfg.H || cfg.Height;
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

  // compute window size
  const { width: winW, height: winH } = calculateWindowSize(sections);
  const finalWidth  = Math.round(winW);
  const finalHeight = Math.round(winH);

  const win = createWidgetsWindow(
    iniPath, sectionName, sections, vars, baseDir,
    finalWidth, finalHeight, draggable
  );

  widgetWindows.set(iniPath, win);
  windowSizes.set(iniPath, { width: finalWidth, height: finalHeight });

  win.setBounds({ width: finalWidth, height: finalHeight });
  win.setMinimumSize(finalWidth, finalHeight);
  win.setMaximumSize(finalWidth, finalHeight);

  if (winX !== null && winY !== null) {
    win.setBounds({ x: winX, y: winY, width: finalWidth, height: finalHeight });
  }

  win.setMovable(false);

  if (clickVal === 0) {
    win.setIgnoreMouseEvents(true, { forward: true });
    console.log(`widgetManager: click-through MODE for ${sectionName}`);
  } else {
    console.log(`widgetManager: interactive MODE for ${sectionName}`);
  }

  win.setOpacity(transparencyPercent / 100);
  win.snapEdges       = snapEdges;
  win.onHoverBehavior = onHover;
  win.isWidgetDraggable = draggable;

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

function createWidgetsWindow(name, sectionName, secs, vars, baseDir, width, height, draggable) {
  const win = new BrowserWindow({
    width, height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    useContentSize: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
    },
  });

  win.setTitle(name);

  let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin:0; padding:0;
        background:transparent;
        width:${width}px; height:${height}px;
        overflow:hidden; position:relative;
        -webkit-app-region:no-drag;
        box-sizing:border-box;
      }
      #container {
        position:fixed; top:0; left:0;
        width:${width}px; height:${height}px;
        overflow:hidden;
      }
      .widget { position:absolute; }
    </style>
  </head>
  <body
    data-section="${sectionName}"
    data-draggable="${draggable ? '1' : '0'}"
    data-width="${width}"
    data-height="${height}"
  >
    <div id="container">
`;

  for (const raw of Object.values(secs)) {
    const cfg = {};
    for (const [k, v] of Object.entries(raw)) {
      cfg[k] = typeof v === "string" ? substituteVariables(v, vars) : v;
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

  const dragPath    = path.join(__dirname, "WidgetDrag.js").replace(/\\/g, "/");
  const actionsPath = path.join(__dirname, "WidgetActions.js").replace(/\\/g, "/");

  html += `</div>
    <script>require("${dragPath}")</script>
    <script>require("${actionsPath}")</script>
  </body>
</html>
`;

  win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(html),
    { baseURLForDataURL: "file://" + baseDir.replace(/\\/g, "/") + "/" }
  );

  win.once("ready-to-show", () => {
    win.setBounds({ width, height });
    win.show();
  });

  // enforce fixed size
  const lockSize = () => {
    const s = windowSizes.get(name);
    if (s) win.setBounds({ width: s.width, height: s.height });
  };
  win.on("resize", lockSize);
  win.on("blur",   lockSize);
  win.on("show",   lockSize);
  win.on("close", (e) => {
    if (!app.isWidgetQuiting) { e.preventDefault(); win.hide(); }
  });

  return win;
}
