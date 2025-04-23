const fs = require('fs');
const path = require('path');

let Logging = 0;
let DarkMode = 0;

function getIniValue(keyName) {
    const sectionName = "DeskFlex";
    const filePath = process.env.APPDATA + "\\DeskFlex\\DeskFlex.ini";
    const data = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    let currentSection = null;
    const lines = data.split('\n');
    lines.forEach(line => {
        line = line.trim();
        if (line === '' || line.startsWith(';') || line.startsWith('#')) {
            return;
        }
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

    if (result[sectionName] && result[sectionName][keyName]) {
        return result[sectionName][keyName];
    } else {
        return null;
    }
}

// Assign values
Logging = getIniValue('Logging') || 0;
DarkMode = getIniValue('DarkMode') || 0;

console.log('Logging is', Logging); 
console.log('DarkMode is', DarkMode);
