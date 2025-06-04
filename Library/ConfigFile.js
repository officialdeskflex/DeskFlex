const fs = require("fs");
const path = require("path");

/**
 * Reads a value from an INI file based on section and key names.
 * @param {string} widgetName - The name of the section in the INI file.
 * @param {string} keyName - The key name whose value you want to retrieve.
 * @returns {string|null} - The value of the key, or null if not found.
 */
function getIniValue(widgetName, keyName) {
  const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");

  if (!fs.existsSync(filePath)) return null;

  const data = fs.readFileSync(filePath, "utf-8");
  const result = {};
  let currentSection = null;
  const lines = data.split("\n");

  lines.forEach((line) => {
    line = line.trim();
    if (line === "" || line.startsWith(";") || line.startsWith("#")) return;

    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim();
      if (!result[currentSection]) result[currentSection] = {};
    } else if (currentSection) {
      const [key, ...rest] = line.split("=");
      const value = rest.join("=").trim();
      if (key && value !== undefined) {
        result[currentSection][key.trim()] = value;
      }
    }
  });

  return result[widgetName]?.[keyName] ?? null;
}

/**
 * Updates a value in a specific section of the INI file.
 * If the section or key does not exist, they will be created.
 * @param {string} widgetName - The section to update.
 * @param {string} keyName - The key to update.
 * @param {string} value - The new value to set.
 */
function setIniValue(widgetName, keyName, value) {
  const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");

  if (!fs.existsSync(filePath)) return false;

  const data = fs.readFileSync(filePath, "utf-8");
  const lines = data.split("\n");
  let output = [];
  let currentSection = null;
  let sectionFound = false;
  let keyUpdated = false;

  for (let line of lines) {
    let trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (currentSection === widgetName && !keyUpdated) {
        output.push(`${keyName}=${value}`);
        keyUpdated = true;
      }
      currentSection = trimmed.slice(1, -1).trim();
      output.push(line);
      sectionFound = sectionFound || currentSection === widgetName;
    } else if (
      currentSection === widgetName &&
      trimmed.startsWith(keyName + "=")
    ) {
      output.push(`${keyName}=${value}`);
      keyUpdated = true;
    } else {
      output.push(line);
    }
  }

  if (!sectionFound) {
    output.push("");
    output.push(`[${widgetName}]`);
    output.push(`${keyName}=${value}`);
  } else if (!keyUpdated) {
    let indexToInsert = output.findIndex(
      (line) => line.trim() === `[${widgetName}]`
    );
    while (
      indexToInsert + 1 < output.length &&
      !output[indexToInsert + 1].startsWith("[")
    ) {
      indexToInsert++;
    }
    output.splice(indexToInsert + 1, 0, `${keyName}=${value}`);
  }

  fs.writeFileSync(filePath, output.join("\n"), "utf-8");
  return true;
}

/**
 * Sets the 'Active' value in the specified widget (e.g., "Test\Test.ini")
 * based on the value from the settings file (e.g., "%APPDATA%\DeskFlex\DeskFlex.ini").
 * Returns the values of the relevant keys.
 */

const setActiveValue = (widgetName, value) =>
  setIniValue(widgetName, "Active", value);

/**
 * Function to get the folder structure for .ini files as JSON
 * @returns {object} - JSON object representing the folder structure with .ini files.
 */
function getFolderStructure(folderPath = getWidgetsPath()) {
  const result = {};
  if (!fs.existsSync(folderPath)) return result;
  const items = fs.readdirSync(folderPath);
  items.forEach((item) => {
    const itemPath = path.join(folderPath, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      result[item] = getFolderStructure(itemPath);
    } else if (stats.isFile() && item.endsWith(".ini")) {
      result[item] = null;
    }
  });
  return result;
}

/**
 * Reads the INI file and returns a JSON object of all sections that have Active=1.
 */

function getActiveWidgets() {
  const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  const result = {};
  let currentSection = null;
  const lines = data.split("\n");
  lines.forEach((line) => {
    line = line.trim();
    if (line === "" || line.startsWith(";") || line.startsWith("#")) return;

    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim();
      if (!result[currentSection]) result[currentSection] = {};
    } else if (currentSection) {
      const [key, ...rest] = line.split("=");
      const value = rest.join("=").trim();
      if (key && value !== undefined) {
        result[currentSection][key.trim()] = value;
      }
    }
  });
  const activeSections = Object.entries(result)
    .filter(([_, values]) => values.Active === "1")
    .map(([widgetName]) => widgetName);

  return activeSections;
}

/**
 * Reads the [DeskFlex] section from the settings file
 * (e.g., "%APPDATA%\\DeskFlex\\DeskFlex.ini") and returns the key-value pairs.
 */

const getLogging = () => parseInt(getIniValue("DeskFlex", "Logging")) || 0;
const getDebugging = () => parseInt(getIniValue("DeskFlex", "Debugging")) || 0;
const getDarkMode = () => parseInt(getIniValue("DeskFlex", "DarkMode")) || 0;
const getWidgetsPath = () => getIniValue("DeskFlex", "WidgetsPath");
const showStart = () => parseInt(getIniValue("DeskFlex", "ShowOnStart")) || 0;
const getConfigEditorPath = () => getIniValue("DeskFlex", "ConfigEditor");

/**
 * Reads the section corresponding to the widget name (e.g., "Test\\Test.ini")
 * from the settings file (e.g., "%APPDATA%\\DeskFlex\\DeskFlex.ini")
 * and returns the key-value pairs.
 */

function getWidgetStatus(widgetName) {
  return getIniValue(widgetName, "Active");
}

function getWidgetWindowX(widgetName) {
  return getIniValue(widgetName, "WindowX");
}

function getWidgetWindowY(widgetName) {
  return getIniValue(widgetName, "WindowY");
}

function getWidgetPosition(widgetName) {
  return getIniValue(widgetName, "Position");
}

function getWidgetClickThrough(widgetName) {
  return getIniValue(widgetName, "ClickThrough");
}
function getWidgetDraggable(widgetName) {
  return getIniValue(widgetName, "Draggable");
}

function getWidgetSnapEdges(widgetName) {
  return getIniValue(widgetName, "SnapEdges");
}

function getWidgetKeepOnScreen(widgetName) {
  return getIniValue(widgetName, "KeepOnScreen");
}

function getWidgetOnHover(widgetName) {
  return getIniValue(widgetName, "OnHover");
}

function getWidgetTransparency(widgetName) {
  return getIniValue(widgetName, "Transparency");
}

function getWidgetFavorite(widgetName) {
  return getIniValue(widgetName, "Favorite");
}

function getWidgetSavePosition(widgetName) {
  return getIniValue(widgetName, "SavePosition");
}

function getWidgetLoadOrder(widgetName) {
  return getIniValue(widgetName, "LoadOrder");
}

module.exports = {
  getIniValue,
  setIniValue,
  setActiveValue,
  getFolderStructure,
  getActiveWidgets,
  getLogging,
  getDebugging,
  getDarkMode,
  getWidgetsPath,
  showStart,
  getConfigEditorPath,
  getWidgetStatus,
  getWidgetWindowX,
  getWidgetWindowY,
  getWidgetPosition,
  getWidgetClickThrough,
  getWidgetDraggable,
  getWidgetSnapEdges,
  getWidgetKeepOnScreen,
  getWidgetOnHover,
  getWidgetTransparency,
  getWidgetFavorite,
  getWidgetSavePosition,
  getWidgetLoadOrder,
};
