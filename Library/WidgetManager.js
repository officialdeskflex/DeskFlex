// WidgetManager.js
const { BrowserWindow, app } = require("electron");
const path = require("path");
const { parseIni } = require("./ConfigParser");
const { renderTextWidget } = require("./Elements/Text");
const { renderImageWidget } = require("./Elements/Image");
const { renderShapeWidget } = require("./Elements/Shape");
const getImageSize = require("./Helper/ImageSize");
const { registerIpcHandlers } = require("./WidgetIpcHandlers");
const { logs } = require("./Logs");
const { handleWindowPosition } = require("./Helper/PositionHandler");
const {
  substituteVariables,
  safeInt,
  resolveIniPath,
  getRelativeWidgetPath,
} = require("./Utils");
const {
  getWidgetClickThrough,
  getWidgetWindowX,
  getWidgetWindowY,
  getWidgetDraggable,
  getWidgetSnapEdges,
  getWidgetTransparency,
  getWidgetOnHover,
  getWidgetsPath,
  getWidgetKeepOnScreen,
  setActiveValue,
  getWidgetPosition,
} = require("./ConfigFile");

const widgetWindows = new Map();
const windowSizes = new Map();

//=======================================================================================================//
//                 LOAD AND UNLOAD WIDGET FUNCTIONS                                                      //
//=======================================================================================================//
function loadWidget(filePath) {
  const iniPath = resolveIniPath(filePath);

  const widgetsBase = getWidgetsPath();
  const widgetName = path.relative(widgetsBase, iniPath).replace(/\[/g, "\\");

  const clickVal = Number(getWidgetClickThrough(widgetName)) === 1 ? 1 : 0;
  const winX = safeInt(getWidgetWindowX(widgetName), null);
  const winY = safeInt(getWidgetWindowY(widgetName), null);
  const draggable = Number(getWidgetDraggable(widgetName)) === 1;
  const snapEdges = getWidgetSnapEdges(widgetName) || "";
  const transparencyPercent = safeInt(getWidgetTransparency(widgetName), 100);
  const onHover = Number(getWidgetOnHover(widgetName)) || 0;
  const keepOnScreenVal = Number(getWidgetKeepOnScreen(widgetName)) === 1;
  const position = safeInt(getWidgetPosition(widgetName), 0);

  console.log(`The loaded Widget Clickthrough ${clickVal}`);

  let widgetNames;
  try {
    widgetNames = parseIni(iniPath);
  } catch (err) {
    console.error(`Failed to parse ${path.basename(iniPath)}:`, err);
    return;
  }

  for (const cfg of Object.values(widgetNames)) {
    ["x", "y", "w", "h", "style"].forEach((k) => {
      const low = k.toLowerCase(),
        up = k.toUpperCase();
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
        ["X", "Y", "W", "H", "Width", "Height"].forEach((k) => {
          if (base[k] !== undefined && cfg[k] === undefined) {
            cfg[k] = base[k];
          }
        });
      } else {
        console.warn(`Style "${cfg.Style}" not found.`);
      }
    }
  }

  for (const cfg of Object.values(widgetNames)) {
    if ((cfg.element || "").trim().toLowerCase() === "shape") {
      const shapeDef = (cfg.Shape || "").trim();
      if (!shapeDef) {
        console.warn(`Empty Shape definition for a Shape-Element.`);
        continue;
      }

      const shapeParts = shapeDef.split("|").map((p) => p.trim());
      const mainPart = shapeParts[0]; // e.g. "Rectangle 4,4,110,110,55"

      const [shapeTypeRaw, coordStr] = mainPart.split(/\s+(.+)/);
      const shapeType = (shapeTypeRaw || "").toLowerCase();
      if (shapeType !== "rectangle" || !coordStr) {
        console.warn(
          `Unsupported Shape type or malformed params: "${shapeDef}"`
        );
        continue;
      }

      const coords = coordStr.split(",").map((n) => parseInt(n, 10).valueOf());
      const [sx = 0, sy = 0, sw = 0, sh = 0, sr = 0] = coords;
      cfg.X = sx;
      cfg.Y = sy;
      cfg.W = sw;
      cfg.H = sh;
      cfg.Radius = sr;

      cfg.FillColor = "#FFFFFF";
      cfg.StrokeColor = "#000000";
      cfg.StrokeWidth = 1;

      for (let i = 1; i < shapeParts.length; i++) {
        const token = shapeParts[i];

        const m = token.match(/^(.+?)\s+([\d,]+)$/);
        if (!m) {
          console.warn(`Malformed Shape style token: "${token}"`);
          continue;
        }
        const keyRaw = m[1].trim().toLowerCase();
        const valueRaw = m[2].trim();

        function rgbToHex(rgbString) {
          const nums = rgbString
            .split(",")
            .map((n) => parseInt(n, 10).valueOf());
          if (nums.length !== 3 || nums.some((x) => isNaN(x))) return null;
          const [r, g, b] = nums;
          const toHex = (x) => {
            const h = x.toString(16);
            return h.length === 1 ? "0" + h : h;
          };
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }

        if (
          keyRaw === "fill" ||
          keyRaw === "fillcolor" ||
          keyRaw === "fill color"
        ) {
          const hex = rgbToHex(valueRaw);
          if (hex) cfg.FillColor = hex;
        } else if (
          keyRaw === "stroke" ||
          keyRaw === "strokecolor" ||
          keyRaw === "stroke color"
        ) {
          const hex = rgbToHex(valueRaw);
          if (hex) cfg.StrokeColor = hex;
        } else if (keyRaw === "strokewidth") {
          const swv = parseInt(valueRaw, 10);
          if (!isNaN(swv)) cfg.StrokeWidth = swv;
        } else {
          console.warn(`Unknown Shape style token: "${token}"`);
        }
      }
    }
  }

  usedStyles.forEach((s) => delete widgetNames[s]);

  const baseDir = path.dirname(iniPath);
  for (const cfg of Object.values(widgetNames)) {
    if ((cfg.element || "").trim().toLowerCase() === "image") {
      let img = (cfg.ImageName || "").replace(/"/g, "");
      if (!path.isAbsolute(img)) img = path.join(baseDir, img);
      const hasW = cfg.W || cfg.Width,
        hasH = cfg.H || cfg.Height;
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
  const finalWidth = Math.round(winW);
  const finalHeight = Math.round(winH);

  const win = createWidgetsWindow(
    iniPath,
    widgetName,
    widgetNames,
    vars,
    baseDir,
    finalWidth,
    finalHeight,
    draggable,
    keepOnScreenVal,
    clickVal,
    transparencyPercent,
    onHover,
    position
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

  win.setOpacity(transparencyPercent / 100);
  win.snapEdges = snapEdges;
  win.onHoverBehavior = onHover;
  win.isWidgetDraggable = draggable;
  win.keepOnScreen = keepOnScreenVal;

  setActiveValue(getRelativeWidgetPath(filePath), "1");
  logs(`Loaded widget: ${getRelativeWidgetPath(filePath)}`, "info", "DeskFlex");
  console.log(`Loaded widget: ${getRelativeWidgetPath(filePath)}`);

  return win;
}

/**
 *  UNLOAD WIDGET
 */
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
  let maxR = 0,
    maxB = 0;
  for (const cfg of Object.values(secs)) {
    const x = safeInt(cfg.X, 0),
      y = safeInt(cfg.Y, 0);
    const w = safeInt(cfg.Width ?? cfg.W, 0),
      h = safeInt(cfg.Height ?? cfg.H, 0);
    maxR = Math.max(maxR, x + w);
    maxB = Math.max(maxB, y + h);
  }
  return { width: maxR, height: maxB };
}

function createWidgetsWindow(
  name,
  widgetName,
  secs,
  vars,
  baseDir,
  width,
  height,
  draggable,
  keepOnScreen,
  clickVal,
  transparencyPercent,
  onHover,
  position
) {
  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    minimizable: true,
    skipTaskbar: true,
    resizable: false,
    useContentSize: true,
    hasShadow: false,
    roundedCorners: false,
    // backgroundColor: "#000000",
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
    data-draggable="${draggable ? "1" : "0"}"
    data-keep-on-screen="${keepOnScreen ? "1" : "0"}"
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
    switch ((cfg.element || "").trim()) {
      case "Text":
        html += renderTextWidget(cfg);
        break;
      case "Image":
        html += renderImageWidget(cfg, baseDir);
        break;
      case "Shape":
        html += renderShapeWidget(cfg);
        break;
      default:
        console.warn(`Skipping unknown element="${cfg.element}"`);
    }
  }

  const dragPath = path
    .join(__dirname, "WidgetProcess/WidgetDrag.js")
    .replace(/\\/g, "/");
  const actionsPath = path
    .join(__dirname, "WidgetProcess/WidgetActions.js")
    .replace(/\\/g, "/");
  const hoverHelperPath = path
    .join(__dirname, "WidgetProcess/HoverHelper.js")
    .replace(/\\/g, "/");
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

  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html), {
    baseURLForDataURL: "file://" + baseDir.replace(/\\/g, "/") + "/",
  });

  win.once("ready-to-show", () => {
    win.setBounds({ width, height });
    win.show();

    if (clickVal === 1) {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  const lockSize = () => {
    const s = windowSizes.get(name);
    if (s) win.setBounds({ width: s.width, height: s.height });
  };
  ["resize", "blur", "show"].forEach((evt) => win.on(evt, lockSize));
  win.on("close", (e) => {
    if (!app.isWidgetQuiting) {
      e.preventDefault();
      win.hide();
    }
  });
  handleWindowPosition(position, name, win);
  return win;
}

registerIpcHandlers(widgetWindows, windowSizes, loadWidget, unloadWidget);

module.exports = { loadWidget, unloadWidget, widgetWindows, windowSizes };
