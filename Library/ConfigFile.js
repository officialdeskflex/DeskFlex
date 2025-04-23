const fs = require('fs');
const path = require('path');

var Logging=0;

function getIniValue(keyName) {
    sectionName="DeskFlex"
    filePath=process.env.APPDATA+"\\DeskFlex\\DeskFlex.ini";
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
        Logging=result[sectionName][keyName];
        return result[sectionName][keyName];
    } else {
        return null; 
    }
}

const value = getIniValue('Logging');
console.log('Logging is',Logging); 

