const fs = require('fs');
const path = require('path');

function getIniValue(keyName) {
    const sectionName = "DeskFlex";
    const filePath = path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini");
    const data = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    let currentSection = null;
    const lines = data.split('\n');
    lines.forEach(line => {
        line = line.trim();
        if (line === '' || line.startsWith(';') || line.startsWith('#')) return;

        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1).trim();
            result[currentSection] = {};
        } else if (currentSection) {
            const [key, value] = line.split('=').map(part => part.trim());
            if (key && value) {
                result[currentSection][key] = value;
            }
        }
    });

    return result[sectionName]?.[keyName] ?? null;
}

function getLogging() {
    return parseInt(getIniValue('Logging')) || 0;
}

function getDarkMode() {
    return parseInt(getIniValue('DarkMode')) || 0;
}

function getFlexesPath() {
    return getIniValue('FlexesPath');
}

module.exports = {
    getIniValue,
    getLogging,
    getDarkMode,
    getFlexesPath
};
