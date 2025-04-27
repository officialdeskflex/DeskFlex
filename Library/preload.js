const { contextBridge,ipcRenderer } = require('electron');
const path = require('path');
const { getDarkMode, getFolderStructure,getActiveFlex,getFlexesPath} = require('./configFile');
const { getFlexInfo,hasFlexInfoSection } = require('./ReadInfoSection');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure(),
    activeFlex:getActiveFlex(),
    flexPath:getFlexesPath(),
    settingsFile:path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"),
    openConfigSettings: (filePath) => {ipcRenderer.send('open-config-settings', filePath)} ,
    hideWindow: ()=> ipcRenderer.send('hide-window'),
    getFlexInfo: (filePath) => getFlexInfo(filePath),
    hasFlexInfoSection: (filePath) => hasFlexInfoSection(filePath),
});