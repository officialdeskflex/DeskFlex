// WidgetManager.js
const { BrowserWindow, app} = require("electron");
const path = require("path");
const { parseIni } = require("./IniLoader");
const { substituteVariables, safeInt, resolveIniPath, getRelativeWidgetPath } = require("./Utils");
const { renderTextWidget } = require("./TypeSections/TextType");
const { renderImageWidget } = require("./TypeSections/ImageType");
const getImageSize = require("./Helper/ImageSize");
const { getWidgetClickthrough, getWidgetWindowX, getWidgetWindowY, getWidgetDraggable, getWidgetSnapEdges, getWidgetTransparency, getWidgetOnHover, getWidgetsPath, getWidgetKeepOnScreen, setActiveValue,getWidgetPosition } = require("./ConfigFile");
const { registerIpcHandlers } = require("./WidgetIpcHandlers");
const { logs } = require("./Logs");
const { attachPositionHandlers } = require('./Helper/PositionHandler');
const widgetWindows = new Map();
const windowSizes = new Map();

function loadWidget(filePath) {
  const iniPath = resolveIniPath(filePath);

  const widgetsBase = getWidgetsPath();
  const widgetName = path.relative(widgetsBase, iniPath).replace(/\[/g, "\\");

  const clickVal            = Number(getWidgetClickthrough(widgetName)) === 1 ? 1 : 0;
  const winX                = safeInt(getWidgetWindowX(widgetName), null);
  const winY                = safeInt(getWidgetWindowY(widgetName), null);
  const draggable           = Number(getWidgetDraggable(widgetName)) === 1;
  const snapEdges           = getWidgetSnapEdges(widgetName) || "";
  const transparencyPercent = safeInt(getWidgetTransparency(widgetName), 100);
  const onHover             = Number(getWidgetOnHover(widgetName)) || 0;
  const keepOnScreenVal     = Number(getWidgetKeepOnScreen(widgetName)) === 1;
  const position            = safeInt(getWidgetPosition(widgetName), 0); 

  let widgetNames;
  try {
    widgetNames = parseIni(iniPath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(iniPath)}:`, err);
    return;
  }

  for (const cfg of Object.values(widgetNames)) {
    ["x", "y", "w", "h", "style"].forEach(k => {
      const low = k.toLowerCase(), up = k.toUpperCase();
      if (cfg[low] !== undefined && cfg[up] === undefined) {
        cfg[up] = cfg[low];
      }
    });
  }

  const vars = widgetNames.Variables || {};
  delete widgetNames.Variables;

  const usedStyles = new Set();
  for (const cfg of Object.values(widgetNames)) {
    if (cfg.Style) {
      usedStyles.add(cfg.Style);
      const base = widgetNames[cfg.Style];
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
  usedStyles.forEach(s => delete widgetNames[s]);

  const baseDir = path.dirname(iniPath);
  for (const cfg of Object.values(widgetNames)) {
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

  const { width: winW, height: winH } = calculateWindowSize(widgetNames);
  const finalWidth  = Math.round(winW);
  const finalHeight = Math.round(winH);

  const win = createWidgetsWindow(iniPath, widgetName, widgetNames, vars, baseDir,finalWidth, finalHeight, draggable, keepOnScreenVal, clickVal, transparencyPercent, onHover,position);

  widgetWindows.set(iniPath, win);
  windowSizes.set(iniPath, { width: finalWidth, height: finalHeight });

  win.setBounds({ width: finalWidth, height: finalHeight });
  win.setMinimumSize(finalWidth, finalHeight);
  win.setMaximumSize(finalWidth, finalHeight);
  if (winX !== null && winY !== null) {
    win.setBounds({ x: winX, y: winY, width: finalWidth, height: finalHeight });
  }
  win.setMovable(false);

  if (clickVal === 1) {
    win.setIgnoreMouseEvents(true, { forward: true });
  }
  win.setOpacity(transparencyPercent / 100);
  win.snapEdges          = snapEdges;
  win.onHoverBehavior    = onHover;
  win.isWidgetDraggable  = draggable;       
  win.keepOnScreen       = keepOnScreenVal; 

  setActiveValue(getRelativeWidgetPath(filePath), "1");
  logs(`Loaded widget: ${getRelativeWidgetPath(filePath)}`, "info", "DeskFlex");
  console.log(`Loaded widget: ${getRelativeWidgetPath(filePath)}`);

  return win;
}

function unloadWidget(widgetName) {
  console.log(`Unloading widget: ${widgetName}`);
  // Find the full iniPath key whose relative path matches widgetName
  let matchedKey = null;
  for (const iniPath of widgetWindows.keys()) {
    if (getRelativeWidgetPath(iniPath) === widgetName) {
      matchedKey = iniPath;
      break;
    }
  }

  if (!matchedKey) {
    console.warn(`Widget not active or not found: ${widgetName}`);
    logs(`Widget is not active: ${widgetName}`, "error", "DeskFlex");
    return;
  }

  console.log(`Unloading widget: ${widgetName}`);
  app.isWidgetQuiting = true;

  const win = widgetWindows.get(matchedKey);
  if (win) win.close();

  widgetWindows.delete(matchedKey);
  windowSizes.delete(matchedKey);
  setActiveValue(widgetName, "0");

  logs(`Unloaded widget: ${widgetName}`, "info", "DeskFlex");
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

function createWidgetsWindow(name, widgetName, secs, vars, baseDir,width, height, draggable, keepOnScreen, clickVal, transparencyPercent, onHover,position) {
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
  <head><meta charset="utf-8"><style>
    html,body {margin:0;padding:0;
      background:transparent;
      width:${width}px;height:${height}px;
      overflow:hidden;position:relative;
      box-sizing:border-box;}
    #container{position:fixed;top:0;left:0;
      width:${width}px;height:${height}px;overflow:hidden;}
    .widget{position:absolute;}
  </style></head>
  <body
    data-widget-name="${widgetName}"
    data-draggable="${draggable ? '1':'0'}"
    data-keep-on-screen="${keepOnScreen ? '1':'0'}"
    data-width="${width}"
    data-height="${height}"
    data-clickthrough="${clickVal}"
  >
    <div id="container">
`;

  for (const raw of Object.values(secs)) {
    const cfg = {};
    for (const [k, v] of Object.entries(raw)) {
      cfg[k] = typeof v === "string" ? substituteVariables(v, vars) : v;
    }
    switch ((cfg.Type||"").trim()) {
      case "Text":  html += renderTextWidget(cfg); break;
      case "Image": html += renderImageWidget(cfg, baseDir); break;
      default: console.warn(`Skipping unknown Type="${cfg.Type}"`);
    }
  }

  const dragPath = path.join(__dirname, "WidgetDrag.js").replace(/\\/g, "/");
  const actionsPath = path.join(__dirname, "WidgetActions.js").replace(/\\/g, "/");
  const hoverHelperPath = path.join(__dirname, "Helper/HoverHelper.js").replace(/\\/g, "/");
  const widgetPath = name.replace(/\\/g, "\\\\");


  html += `</div>
<script>
  const container = document.getElementById("container");
  const hoverType = ${onHover};
  const transparencyPercent = ${transparencyPercent};
  const widgetPath = "${widgetPath}";
  const { initializeHoverBehavior } = require("${hoverHelperPath}");
  initializeHoverBehavior(container, hoverType, transparencyPercent, widgetPath);
</script>
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

  const lockSize = () => {
    const s = windowSizes.get(name);
    if (s) win.setBounds({ width: s.width, height: s.height });
  };
  ["resize","blur","show"].forEach(evt => win.on(evt, lockSize));
  win.on("close", e => {
    if (!app.isWidgetQuiting) { e.preventDefault(); win.hide(); }
  });
  attachPositionHandlers(win, name, position);
  return win;
}

registerIpcHandlers(widgetWindows, windowSizes, loadWidget, unloadWidget);

module.exports = { loadWidget, unloadWidget, widgetWindows,windowSizes };