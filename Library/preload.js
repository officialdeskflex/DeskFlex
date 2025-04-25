const { contextBridge } = require('electron');
const { getDarkMode, getFolderStructure,getActiveFlex } = require('./ConfigFile');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure(),
    activeFlex:getActiveFlex(),
});
