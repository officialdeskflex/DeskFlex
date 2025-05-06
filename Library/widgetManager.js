// widgetManager.js
const { BrowserWindow, app } = require("electron");
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

const widgetWindows = new Map();

module.exports = { loadWidgetsFromIniFile, unloadWidgetsBySection };

function loadWidgetsFromIniFile(filePath) {
  let sections;
  try {
    sections = parseIni(filePath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(filePath)}:`, err);
    return;
  }

  for (const cfg of Object.values(sections)) {
    ["x", "y", "w", "h", "style"].forEach((k) => {
      const low = k.toLowerCase();
      const up = k.toUpperCase();
      if (cfg[low] !== undefined && cfg[up] === undefined) {
        cfg[up] = cfg[low];
      }
    });
  }

  const vars = sections.Variables || {};
  delete sections.Variables;

  const used = new Set();
  for (const cfg of Object.values(sections)) {
    if (cfg.Style) {
      used.add(cfg.Style);
      const styleSec = sections[cfg.Style];
      if (styleSec) {
        ["X", "Y", "W", "H", "Width", "Height"].forEach((k) => {
          if (styleSec[k] !== undefined && cfg[k] === undefined) {
            cfg[k] = styleSec[k];
          }
        });
      } else {
        console.warn(`Style "${cfg.Style}" not found.`);
      }
    }
  }
  used.forEach((s) => delete sections[s]);

  const baseDir = path.dirname(filePath);
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

  const { width: winW, height: winH } = calculateWindowSize(sections);

  const name = path.basename(filePath, ".ini");
  const win = createWidgetsWindow(name, sections, vars, baseDir, winW, winH);
  widgetWindows.set(name, win);
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
  let maxR = 0,
    maxB = 0;
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
    },
  });

  let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
              body { margin:0; padding:0; background:transparent;
                     width:${width}px; height:${height}px;
                     overflow:hidden; position:relative;  -webkit-app-region: drag; }
              .widget,
      .widget * {
        -webkit-app-region: no-drag;
      }
    </style>
  </head>
  <body></body>
</html>
  `;

  for (const raw of Object.values(secs)) {
    const cfg = {};
    for (let [k, v] of Object.entries(raw)) {
      if (typeof v === "string") v = substituteVariables(v, vars);
      cfg[k] = v;
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

  const actionsPath = path
    .join(__dirname, "WidgetActions.js")
    .replace(/\\/g, "/");
  html += `<script>require('${actionsPath}')</script></body></html>`;

  const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  const baseUrl = "file://" + baseDir.replace(/\\/g, "/") + "/";
  win.loadURL(dataUrl, { baseURLForDataURL: baseUrl });

  win.once("ready-to-show", () => win.show());
  win.on("close", (e) => {
    if (!app.isWidgetQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}
