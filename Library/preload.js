const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { getDarkMode, getFolderStructure, getActiveWidgets, getWidgetsPath, getWidgetStatus, getWidgetWindowX, getWidgetWindowY, getWidgetPosition, getWidgetClickthrough, getWidgetDraggable, getWidgetSnapEdges, getWidgetKeepOnScreen, getWidgetOnHover, getWidgetTransparency, getWidgetFavorite, getWidgetSavePosition ,getWidgetLoadOrder,setActiveValue} = require('./ConfigFile');
const { getWidgetInfo, hasWidgetInfoSection, } = require('./ReadInfoSection');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure(),
    activeWidget: () => getActiveWidgets(),
    widgetPath: getWidgetsPath(),
    settingsFile: path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"),
    openConfigSettings: (filePath) => { ipcRenderer.send('open-config-settings', filePath) },
    hideWindow: () => ipcRenderer.send('hide-window'),
    getWidgetInfo: (filePath) => getWidgetInfo(filePath),
    hasWidgetInfoSection: (filePath) => hasWidgetInfoSection(filePath),
    setActiveValue: (widgetName, value) => setActiveValue(widgetName, value),
    
    getWidgetStatus: (widgetName) => getWidgetStatus(widgetName),
    getWidgetWindowX: (widgetName) => getWidgetWindowX(widgetName),
    getWidgetWindowY: (widgetName) => getWidgetWindowY(widgetName),
    getWidgetPosition: (widgetName) => getWidgetPosition(widgetName),
    getWidgetClickthrough: (widgetName) => getWidgetClickthrough(widgetName),
    getWidgetDraggable: (widgetName) => getWidgetDraggable(widgetName),
    getWidgetSnapEdges: (widgetName) => getWidgetSnapEdges(widgetName),
    getWidgetKeepOnScreen: (widgetName) => getWidgetKeepOnScreen(widgetName),
    getWidgetOnHover: (widgetName) => getWidgetOnHover(widgetName),
    getWidgetTransparency: (widgetName) => getWidgetTransparency(widgetName),
    getWidgetFavorite: (widgetName) => getWidgetFavorite(widgetName),
    getWidgetSavePosition: (widgetName) => getWidgetSavePosition(widgetName),
    getWidgetLoadOrder: (widgetName) => getWidgetLoadOrder(widgetName),

    loadWidget: (widgetName) => {return ipcRenderer.invoke('load-widget', widgetName);},
    unloadWidget: (widgetName) => {return ipcRenderer.invoke('unload-widget', widgetName);},
    onWidgetStatusChanged: (callback) => {ipcRenderer.on('widget-status-changed', (event, section) => {callback(section);});},

    sendLog: (message, type, source = '') => ipcRenderer.send('log-message', message, type, source),
    getLogs: () => ipcRenderer.invoke('get-logs'),
    clearAllLogs: () => ipcRenderer.invoke('clear-logs'),

    createLogsWindow: () => ipcRenderer.invoke('deskflex:createLogsWindow')
});