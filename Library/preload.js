const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { getDarkMode, getFolderStructure, getActiveFlex, getFlexesPath, getFlexStatus, getFlexWindowX, getFlexWindowY, getFlexPosition, getFlexClickthrough, getFlexDraggable, getFlexSnapEdges, getFlexKeepOnScreen, getFlexOnHover, getFlexTransparency, getFlexFavorite, getFlexSavePosition ,getFlexLoadOrder,setActiveValue} = require('./ConfigFile');
const { getFlexInfo, hasFlexInfoSection, } = require('./ReadInfoSection');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure(),
    activeFlex: getActiveFlex(),
    flexPath: getFlexesPath(),
    settingsFile: path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"),
    openConfigSettings: (filePath) => { ipcRenderer.send('open-config-settings', filePath) },
    hideWindow: () => ipcRenderer.send('hide-window'),
    getFlexInfo: (filePath) => getFlexInfo(filePath),
    hasFlexInfoSection: (filePath) => hasFlexInfoSection(filePath),
    setActiveValue: (sectionName, value) => setActiveValue(sectionName, value),
    
    getFlexStatus: (flexSection) => getFlexStatus(flexSection),
    getFlexWindowX: (flexSection) => getFlexWindowX(flexSection),
    getFlexWindowY: (flexSection) => getFlexWindowY(flexSection),
    getFlexPosition: (flexSection) => getFlexPosition(flexSection),
    getFlexClickthrough: (flexSection) => getFlexClickthrough(flexSection),
    getFlexDraggable: (flexSection) => getFlexDraggable(flexSection),
    getFlexSnapEdges: (flexSection) => getFlexSnapEdges(flexSection),
    getFlexKeepOnScreen: (flexSection) => getFlexKeepOnScreen(flexSection),
    getFlexOnHover: (flexSection) => getFlexOnHover(flexSection),
    getFlexTransparency: (flexSection) => getFlexTransparency(flexSection),
    getFlexFavorite: (flexSection) => getFlexFavorite(flexSection),
    getFlexSavePosition: (flexSection) => getFlexSavePosition(flexSection),
    getFlexLoadOrder: (flexSection) => getFlexLoadOrder(flexSection),

    loadWidget: (section) => {return ipcRenderer.invoke('load-widget', section);},
    unloadWidget: (section) => {return ipcRenderer.invoke('unload-widget', section);},

    sendLog: (message, type, source = '') => ipcRenderer.send('log-message', message, type, source),
    getLogs: () => ipcRenderer.invoke('get-logs'),

    createLogsWindow: () => ipcRenderer.invoke('deskflex:createLogsWindow')
});