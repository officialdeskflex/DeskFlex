const { contextBridge } = require('electron');
const { getDarkMode } = require('./ConfigFile');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode()
});
