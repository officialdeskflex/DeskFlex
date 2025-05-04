const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { getDarkMode, getFolderStructure, getActiveFlex, getWidgetsPath, getWidgetStatus, getWidgetWindowX, getWidgetWindowY, getWidgetPosition, getWidgetClickthrough, getWidgetDraggable, getWidgetSnapEdges, getWidgetKeepOnScreen, getWidgetOnHover, getWidgetTransparency, getWidgetFavorite, getWidgetSavePosition ,getWidgetLoadOrder,setActiveValue} = require('./ConfigFile');
const { getFlexInfo, hasFlexInfoSection, } = require('./ReadInfoSection');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure(),
    activeFlex: getActiveFlex(),
    flexPath: getWidgetsPath(),
    settingsFile: path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"),
    openConfigSettings: (filePath) => { ipcRenderer.send('open-config-settings', filePath) },
    hideWindow: () => ipcRenderer.send('hide-window'),
    getFlexInfo: (filePath) => getFlexInfo(filePath),
    hasFlexInfoSection: (filePath) => hasFlexInfoSection(filePath),
    setActiveValue: (sectionName, value) => setActiveValue(sectionName, value),
    
    getWidgetStatus: (flexSection) => getWidgetStatus(flexSection),
    getWidgetWindowX: (flexSection) => getWidgetWindowX(flexSection),
    getWidgetWindowY: (flexSection) => getWidgetWindowY(flexSection),
    getWidgetPosition: (flexSection) => getWidgetPosition(flexSection),
    getWidgetClickthrough: (flexSection) => getWidgetClickthrough(flexSection),
    getWidgetDraggable: (flexSection) => getWidgetDraggable(flexSection),
    getWidgetSnapEdges: (flexSection) => getWidgetSnapEdges(flexSection),
    getWidgetKeepOnScreen: (flexSection) => getWidgetKeepOnScreen(flexSection),
    getWidgetOnHover: (flexSection) => getWidgetOnHover(flexSection),
    getWidgetTransparency: (flexSection) => getWidgetTransparency(flexSection),
    getWidgetFavorite: (flexSection) => getWidgetFavorite(flexSection),
    getWidgetSavePosition: (flexSection) => getWidgetSavePosition(flexSection),
    getWidgetLoadOrder: (flexSection) => getWidgetLoadOrder(flexSection),

    loadWidget: (section) => {return ipcRenderer.invoke('load-widget', section);},
    unloadWidget: (section) => {return ipcRenderer.invoke('unload-widget', section);},

    sendLog: (message, type, source = '') => ipcRenderer.send('log-message', message, type, source),
    getLogs: () => ipcRenderer.invoke('get-logs'),

    createLogsWindow: () => ipcRenderer.invoke('deskflex:createLogsWindow')
});