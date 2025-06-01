// WidgetManager.js
const { BrowserWindow, app } = require("electron");
const path = require("path");
const { processWidgetConfig } = require("./ConfigParser");
const { renderTextWidget } = require("./Elements/Text");
const { renderImageWidget } = require("./Elements/Image");
const { renderShapeWidget } = require("./Elements/Shape");
const { registerIpcHandlers } = require("./WidgetIpcHandlers");
const { logs } = require("./Logs");
const { handleWindowPosition } = require("./Helper/PositionHandler");
const { safeInt, resolveIniPath, getRelativeWidgetPath } = require("./Utils");
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

  // Get widget settings from configuration
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

  // Process widget configuration using ConfigParser
  let processedWidget;
  try {
    processedWidget = processWidgetConfig(iniPath);
  } catch (err) {
    console.error(`Failed to process widget configuration:`, err);
    return;
  }

  const {
    config: widgetConfig,
    variables,
    baseDir,
    windowSize,
  } = processedWidget;
  const finalWidth = Math.round(windowSize.width);
  const finalHeight = Math.round(windowSize.height);

  const win = createWidgetsWindow(
    iniPath,
    widgetName,
    widgetConfig,
    variables,
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

  configureWindow(
    win,
    finalWidth,
    finalHeight,
    winX,
    winY,
    transparencyPercent,
    snapEdges,
    onHover,
    draggable,
    keepOnScreenVal
  );

  setActiveValue(getRelativeWidgetPath(filePath), "1");
  logs(`Loaded widget: ${getRelativeWidgetPath(filePath)}`, "info", "DeskFlex");
  console.log(`Loaded widget: ${getRelativeWidgetPath(filePath)}`);

  return win;
}

/**
 * Configure window properties and behavior
 */
function configureWindow(
  win,
  width,
  height,
  winX,
  winY,
  transparencyPercent,
  snapEdges,
  onHover,
  draggable,
  keepOnScreen
) {
  win.setBounds({ width, height });
  win.setMinimumSize(width, height);
  win.setMaximumSize(width, height);

  if (winX !== null && winY !== null) {
    win.setBounds({ x: winX, y: winY, width, height });
  }

  win.setMovable(false);
  win.setOpacity(transparencyPercent / 100);

  // Set custom properties
  win.snapEdges = snapEdges;
  win.onHoverBehavior = onHover;
  win.isWidgetDraggable = draggable;
  win.keepOnScreen = keepOnScreen;
}

/**
 * UNLOAD WIDGET
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

/**
 * Create the widget window with HTML content
 */
function createWidgetsWindow(
  name,
  widgetName,
  widgetConfig,
  variables,
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
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
    },
  });

  win.setTitle(name);

  const html = generateWidgetHTML(
    widgetName,
    widgetConfig,
    baseDir,
    width,
    height,
    draggable,
    keepOnScreen,
    clickVal,
    onHover,
    transparencyPercent,
    name
  );

  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html), {
    baseURLForDataURL: "file://" + baseDir.replace(/\\/g, "/") + "/",
  });

  setupWindowEventHandlers(win, name, width, height, clickVal);
  handleWindowPosition(position, name, win);

  return win;
}

/**
 * Generate HTML content for the widget
 */
function generateWidgetHTML(
  widgetName,
  widgetConfig,
  baseDir,
  width,
  height,
  draggable,
  keepOnScreen,
  clickVal,
  onHover,
  transparencyPercent,
  name
) {
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

  // Render widget elements
  for (const cfg of Object.values(widgetConfig)) {
    html += renderWidgetElement(cfg, baseDir);
  }

  html += generateWidgetScripts(onHover, transparencyPercent, name);
  html += `  </body>\n</html>`;

  return html;
}

/**
 * Render individual widget elements
 */
function renderWidgetElement(cfg, baseDir) {
  switch ((cfg.element || "").trim()) {
    case "Text":
      return renderTextWidget(cfg);
    case "Image":
      return renderImageWidget(cfg, baseDir);
    case "Shape":
      return renderShapeWidget(cfg);
    default:
      console.warn(`Skipping unknown element="${cfg.element}"`);
      return "";
  }
}

/**
 * Generate script tags for widget functionality
 */
function generateWidgetScripts(onHover, transparencyPercent, name) {
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

  return `</div>
<script>
  const container = document.getElementById("container");
  const hoverType = ${onHover};
  const transparencyPercent = ${transparencyPercent};
  const widgetPath = "${widgetPath}";
  const { initializeHoverBehavior } = require("${hoverHelperPath}");
  initializeHoverBehavior(container, hoverType, transparencyPercent, widgetPath);
</script>
<script>require("${dragPath}")</script>
<script>require("${actionsPath}")</script>`;
}

/**
 * Setup window event handlers
 */
function setupWindowEventHandlers(win, name, width, height, clickVal) {
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
}

registerIpcHandlers(widgetWindows, windowSizes, loadWidget, unloadWidget);

module.exports = { loadWidget, unloadWidget, widgetWindows, windowSizes };
