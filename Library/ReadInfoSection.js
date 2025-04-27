const fs = require('fs');
const path = require('path');

/**
 * Reads the [FlexInfo] section from a .ini file 
 * and returns it as a JSON object.
 * @returns {{ Name: string|null, Author:string|null, Version: string|null, License: string|null, Information: string|null }}
 */
function getFlexInfo(filePath) {
    if (!fs.existsSync(filePath)) {
        return { Name: null, Author: null, Version: null, License: null, Information: null };
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    let currentSection = null;
    const flexInfo = { Name: null, Author: null, Version: null, License: null, Information: null };
    const keyMap = Object.keys(flexInfo).reduce((map, prop) => {
        map[prop.toLowerCase()] = prop;
        return map;
    }, {});

    data.split(/\r?\n/).forEach(rawLine => {
        const line = rawLine.trim();
        if (!line || line.startsWith(';') || line.startsWith('#')) return;

        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.slice(1, -1).trim().toLowerCase();
            return;
        }

        if (currentSection === 'flexinfo') {
            const idx = line.indexOf('=');
            if (idx === -1) return;

            const rawKey = line.slice(0, idx).trim();
            const rawVal = line.slice(idx + 1).trim();
            const normalized = rawKey.toLowerCase();

            if (normalized in keyMap) {
                flexInfo[keyMap[normalized]] = rawVal;
            }
        }
    });

    return flexInfo;
}

module.exports = { getFlexInfo };
