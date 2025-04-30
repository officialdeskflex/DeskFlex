const fs   = require('fs');
const path = require('path');
const ini  = require('ini');

const INI_PATH = path.join(process.env.APPDATA, 'DeskFlex', 'DeskFlex.ini');

function _loadConfig() {
  if (!fs.existsSync(INI_PATH)) return {};
  return ini.parse(fs.readFileSync(INI_PATH, 'utf-8'));
}

function _saveConfig(cfg) {
  fs.writeFileSync(INI_PATH, ini.stringify(cfg), 'utf-8');
}

/**
 * Reads a value from an INI file based on section and key names.
 * @param {string} sectionName - The name of the section in the INI file.
 * @param {string} keyName - The key name whose value you want to retrieve.
 * @returns {string|null} - The value of the key, or null if not found.
 */
function getIniValue(sectionName, keyName) {
  const cfg = _loadConfig();
  return cfg[sectionName]?.[keyName] ?? null;
}

/**
 * Reads the INI file and returns a JSON object of all sections that have Active=1.
 * @returns {string[]} - Array of section names where Active === '1'.
 */
function getActiveFlex() {
  const cfg = _loadConfig();
  return Object.entries(cfg)
    .filter(([, vals]) => vals.Active === '1')
    .map(([sec]) => sec);
}

/**
 * Function to get the folder structure for .ini files as JSON
 * @param {string} [folderPath] - Path to the folder to scan.
 * @returns {object} - JSON object representing the folder structure with .ini files.
 */
function getFolderStructure(folderPath = getFlexesPath()) {
  const result = {};
  if (!fs.existsSync(folderPath)) return result;
  fs.readdirSync(folderPath).forEach(item => {
    const itemPath = path.join(folderPath, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      result[item] = getFolderStructure(itemPath);
    } else if (stats.isFile() && item.endsWith('.ini')) {
      result[item] = null;
    }
  });
  return result;
}

/**
 * Updates a value in a specific section of the INI file.
 * If the section or key does not exist, they will be created.
 * @param {string} sectionName - The section to update.
 * @param {string} keyName - The key to update.
 * @param {string} value - The new value to set.
 * @returns {boolean} - True if the file was written.
 */
function setIniValue(sectionName, keyName, value) {
  const cfg = _loadConfig();
  cfg[sectionName] = cfg[sectionName] || {};
  cfg[sectionName][keyName] = value;
  _saveConfig(cfg);
  return true;
}

const setActiveValue = (sectionName, value) => setIniValue(sectionName, 'Active', value);

const getLogging   = () => parseInt(getIniValue('DeskFlex','Logging'))     || 0;
const getDebugging = () => parseInt(getIniValue('DeskFlex','Debugging'))   || 0;
const getDarkMode  = () => parseInt(getIniValue('DeskFlex','DarkMode'))    || 0;
const showStart    = () => parseInt(getIniValue('DeskFlex','ShowOnStart')) || 0;
const getFlexesPath        = () => getIniValue('DeskFlex','FlexesPath');
const getConfigEditorPath  = () => getIniValue('DeskFlex','ConfigEditor');

function getFlexStatus     (s) { return getIniValue(s,'Active');       }
function getFlexWindowX    (s) { return getIniValue(s,'WindowX');      }
function getFlexWindowY    (s) { return getIniValue(s,'WindowY');      }
function getFlexPosition   (s) { return getIniValue(s,'Position');     }
function getFlexClickthrough(s){ return getIniValue(s,'Clickthrough'); }
function getFlexDraggable  (s) { return getIniValue(s,'Draggable');    }
function getFlexSnapEdges  (s) { return getIniValue(s,'SnapEdges');    }
function getFlexKeepOnScreen(s){ return getIniValue(s,'KeepOnScreen'); }
function getFlexOnHover    (s) { return getIniValue(s,'OnHover');       }
function getFlexTransparency(s){ return getIniValue(s,'Transparency'); }
function getFlexFavorite   (s) { return getIniValue(s,'Favorite');      }
function getFlexSavePosition(s){ return getIniValue(s,'SavePosition'); }
function getFlexLoadOrder  (s) { return getIniValue(s,'LoadOrder');     }

module.exports = { showStart, getConfigEditorPath, getIniValue, getActiveFlex, getLogging, getDarkMode, getFlexesPath, getDebugging, getFolderStructure, getFlexStatus, getFlexWindowX, getFlexWindowY, getFlexPosition, getFlexClickthrough, getFlexDraggable, getFlexSnapEdges, getFlexKeepOnScreen, getFlexOnHover, getFlexTransparency, getFlexFavorite, getFlexSavePosition, getFlexLoadOrder, setActiveValue };