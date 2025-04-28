const fs = require('fs');
const { execFile } = require('child_process');
const {getConfigEditorPath} = require('./ConfigFile');

/**
 * Opens a specified file using the given editor application.
 */

function openFileWithEditor(filePath) {
    let editorPath = getConfigEditorPath();
    if (!fs.existsSync(editorPath)) {
        console.error('Editor not found at:', editorPath);
        return;
    }
    if (!fs.existsSync(filePath)) {
        console.error('File not found at:', filePath);
        return;
    }
    execFile(editorPath, [filePath], (error) => {
        if (error) {
            console.error('Failed to open file:', error);
        } else {
            console.log(`Opened ${filePath} with ${editorPath}`);
        }
    });
}

module.exports = {openFileWithEditor};