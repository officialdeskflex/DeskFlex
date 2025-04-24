const { contextBridge } = require('electron');
const { getDarkMode, getFolderStructure } = require('./ConfigFile');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure()
});
