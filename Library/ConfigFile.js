const fs = require('fs');
const path = require('path');

/**
 * Reads a value from an INI file based on section and key names.
 * @param {string} sectionName - The name of the section in the INI file.
 * @param {string} keyName - The key name whose value you want to retrieve.
 * @returns {string|null} - The value of the key, or null if not found.
 */
function getIniValue(sectionName, keyName) {
    const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");

    if (!fs.existsSync(filePath)) return null;

    const data = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    let currentSection = null;
    const lines = data.split('\n');

    lines.forEach(line => {
        line = line.trim();
        if (line === '' || line.startsWith(';') || line.startsWith('#')) return;

        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1).trim();
            if (!result[currentSection]) result[currentSection] = {};
        } else if (currentSection) {
            const [key, ...rest] = line.split('=');
            const value = rest.join('=').trim();
            if (key && value !== undefined) {
                result[currentSection][key.trim()] = value;
            }
        }
    });

    return result[sectionName]?.[keyName] ?? null;
}

/**
 * Reads the INI file and returns a JSON object of all sections that have Active=1.
 */
function getActiveWidgets() {
    const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    let currentSection = null;
    const lines = data.split('\n');
    lines.forEach(line => {
        line = line.trim();
        if (line === '' || line.startsWith(';') || line.startsWith('#')) return;

        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1).trim();
            if (!result[currentSection]) result[currentSection] = {};
        } else if (currentSection) {
            const [key, ...rest] = line.split('=');
            const value = rest.join('=').trim();
            if (key && value !== undefined) {
                result[currentSection][key.trim()] = value;
            }
        }
    });
    const activeSections = Object.entries(result)
        .filter(([_, values]) => values.Active === '1')
        .map(([sectionName]) => sectionName);

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
    items.forEach(item => {
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
 */
function setIniValue(sectionName, keyName, value) {
    const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");

    if (!fs.existsSync(filePath)) return false;

    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n');
    let output = [];
    let currentSection = null;
    let sectionFound = false;
    let keyUpdated = false;

    for (let line of lines) {
        let trimmed = line.trim();

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            if (currentSection === sectionName && !keyUpdated) {
                output.push(`${keyName}=${value}`);
                keyUpdated = true;
            }
            currentSection = trimmed.slice(1, -1).trim();
            output.push(line);
            sectionFound = sectionFound || (currentSection === sectionName);
        } else if (currentSection === sectionName && trimmed.startsWith(keyName + '=')) {
            output.push(`${keyName}=${value}`);
            keyUpdated = true;
        } else {
            output.push(line);
        }
    }

    if (!sectionFound) {
        output.push('');
        output.push(`[${sectionName}]`);
        output.push(`${keyName}=${value}`);
    }
    else if (!keyUpdated) {
        let indexToInsert = output.findIndex(line => line.trim() === `[${sectionName}]`);
        while (indexToInsert + 1 < output.length && !output[indexToInsert + 1].startsWith('[')) {
            indexToInsert++;
        }
        output.splice(indexToInsert + 1, 0, `${keyName}=${value}`);
    }

    fs.writeFileSync(filePath, output.join('\n'), 'utf-8');
    return true;
}

const setActiveValue = (sectionName, value) => setIniValue(sectionName, 'Active', value);

//DeskFlex Section Information.
const getLogging = () => parseInt(getIniValue('DeskFlex', 'Logging')) || 0;
const getDebugging = () => parseInt(getIniValue('DeskFlex', 'Debugging')) || 0;
const getDarkMode = () => parseInt(getIniValue('DeskFlex', 'DarkMode')) || 0;
const getWidgetsPath = () => getIniValue('DeskFlex', 'WidgetsPath');
const showStart = () => parseInt(getIniValue('DeskFlex', 'ShowOnStart')) || 0;
const getConfigEditorPath = () => getIniValue('DeskFlex', 'ConfigEditor');

// Flex Section Information Form Settings File.
function getWidgetStatus(widgetSection) { return getIniValue(widgetSection, 'Active'); }
function getWidgetWindowX(widgetSection) { return getIniValue(widgetSection, 'WindowX'); }
function getWidgetWindowY(widgetSection) { return getIniValue(widgetSection, 'WindowY'); }
function getWidgetPosition(widgetSection) { return getIniValue(widgetSection, 'Position'); }
function getWidgetClickthrough(widgetSection) { return getIniValue(widgetSection, 'Clickthrough'); }
function getWidgetDraggable(widgetSection) { return getIniValue(widgetSection, 'Draggable'); }
function getWidgetSnapEdges(widgetSection) { return getIniValue(widgetSection, 'SnapEdges'); }
function getWidgetKeepOnScreen(widgetSection) { return getIniValue(widgetSection, 'KeepOnScreen'); }
function getWidgetOnHover(widgetSection) { return getIniValue(widgetSection, 'OnHover'); }
function getWidgetTransparency(widgetSection) { return getIniValue(widgetSection, 'Transparency'); }
function getWidgetFavorite(widgetSection) { return getIniValue(widgetSection, 'Favorite'); }
function getWidgetSavePosition(widgetSection) { return getIniValue(widgetSection, 'SavePosition'); }
function getWidgetLoadOrder(widgetSection) { return getIniValue(widgetSection, 'LoadOrder'); }

module.exports = { showStart, getConfigEditorPath, getIniValue, getActiveWidgets, getLogging, getDarkMode, getWidgetsPath, getDebugging, getFolderStructure, getWidgetStatus, getWidgetWindowX, getWidgetWindowY, getWidgetPosition, getWidgetClickthrough, getWidgetDraggable, getWidgetSnapEdges, getWidgetKeepOnScreen, getWidgetOnHover, getWidgetTransparency, getWidgetFavorite, getWidgetSavePosition, getWidgetLoadOrder, setActiveValue };