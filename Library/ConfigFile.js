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
function getActiveFlex() {
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
function getFolderStructure(folderPath = getFlexesPath()) {
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

function getLogging() {
    return parseInt(getIniValue('DeskFlex', 'Logging')) || 0;
}

function getDebugging() {
    return parseInt(getIniValue('DeskFlex', 'Debugging')) || 0;
}

function getDarkMode() {
    return parseInt(getIniValue('DeskFlex', 'DarkMode')) || 0;
}

function getFlexesPath() {
    return getIniValue('DeskFlex', 'FlexesPath');
}

function getConfigEditorPath() {
    return getIniValue('DeskFlex', 'ConfigEditor');
}

module.exports = {getConfigEditorPath, getIniValue, getActiveFlex, getLogging, getDarkMode, getFlexesPath, getDebugging, getFolderStructure };

