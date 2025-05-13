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

// Reads the INI file and returns a JSON object of all sections that have Active=1.

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

const setActiveValue = (widgetName, value) =>setIniValue(widgetName, "Active", value);

//DeskFlex Section Information.
const getLogging = () => parseInt(getIniValue("DeskFlex", "Logging")) || 0;
const getDebugging = () => parseInt(getIniValue("DeskFlex", "Debugging")) || 0;
const getDarkMode = () => parseInt(getIniValue("DeskFlex", "DarkMode")) || 0;
const getWidgetsPath = () => getIniValue("DeskFlex", "WidgetsPath");
const showStart = () => parseInt(getIniValue("DeskFlex", "ShowOnStart")) || 0;
const getConfigEditorPath = () => getIniValue("DeskFlex", "ConfigEditor");

// Flex Section Information Form Settings File.
function getWidgetStatus(s) { return getIniValue(s, "Active"); }
function getWidgetWindowX(s) { return getIniValue(s, "WindowX"); }
function getWidgetWindowY(s) { return getIniValue(s, "WindowY"); }
function getWidgetPosition(s) { return getIniValue(s, "Position"); }
function getWidgetClickthrough(s) { return getIniValue(s, "Clickthrough"); }
function getWidgetDraggable(s) { return getIniValue(s, "Draggable"); }
function getWidgetSnapEdges(s) { return getIniValue(s, "SnapEdges"); }
function getWidgetKeepOnScreen(s) { return getIniValue(s, "KeepOnScreen"); }
function getWidgetOnHover(s) { return getIniValue(s, "OnHover"); }
function getWidgetTransparency(s) { return getIniValue(s, "Transparency"); }
function getWidgetFavorite(s) { return getIniValue(s, "Favorite"); }
function getWidgetSavePosition(s) { return getIniValue(s, "SavePosition"); }
function getWidgetLoadOrder(s) { return getIniValue(s, "LoadOrder"); }

module.exports = { showStart, getConfigEditorPath, getIniValue, getActiveWidgets, getLogging, getDarkMode, getWidgetsPath, getDebugging, getFolderStructure, getWidgetStatus, getWidgetWindowX, getWidgetWindowY, getWidgetPosition, getWidgetClickthrough, getWidgetDraggable, getWidgetSnapEdges, getWidgetKeepOnScreen, getWidgetOnHover, getWidgetTransparency, getWidgetFavorite, getWidgetSavePosition, getWidgetLoadOrder, setActiveValue,setIniValue };