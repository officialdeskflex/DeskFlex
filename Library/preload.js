const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { getDarkMode, getFolderStructure, getActiveWidgets, getWidgetsPath, getWidgetStatus, getWidgetWindowX, getWidgetWindowY, getWidgetPosition, getWidgetClickthrough, getWidgetDraggable, getWidgetSnapEdges, getWidgetKeepOnScreen, getWidgetOnHover, getWidgetTransparency, getWidgetFavorite, getWidgetSavePosition ,getWidgetLoadOrder,setActiveValue} = require('./ConfigFile');
const { getWidgetInfo, hasWidgetInfoSection, } = require('./ReadInfoSection');

contextBridge.exposeInMainWorld('deskflex', {
    darkMode: getDarkMode(),
    folderStructure: getFolderStructure(),
    activeWidget: getActiveWidgets(),
    flexPath: getWidgetsPath(),
    settingsFile: path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"),
    openConfigSettings: (filePath) => { ipcRenderer.send('open-config-settings', filePath) },
    hideWindow: () => ipcRenderer.send('hide-window'),
    getWidgetInfo: (filePath) => getWidgetInfo(filePath),
    hasWidgetInfoSection: (filePath) => hasWidgetInfoSection(filePath),
    setActiveValue: (sectionName, value) => setActiveValue(sectionName, value),
    
    getWidgetStatus: (widgetSection) => getWidgetStatus(widgetSection),
    getWidgetWindowX: (widgetSection) => getWidgetWindowX(widgetSection),
    getWidgetWindowY: (widgetSection) => getWidgetWindowY(widgetSection),
    getWidgetPosition: (widgetSection) => getWidgetPosition(widgetSection),
    getWidgetClickthrough: (widgetSection) => getWidgetClickthrough(widgetSection),
    getWidgetDraggable: (widgetSection) => getWidgetDraggable(widgetSection),
    getWidgetSnapEdges: (widgetSection) => getWidgetSnapEdges(widgetSection),
    getWidgetKeepOnScreen: (widgetSection) => getWidgetKeepOnScreen(widgetSection),
    getWidgetOnHover: (widgetSection) => getWidgetOnHover(widgetSection),
    getWidgetTransparency: (widgetSection) => getWidgetTransparency(widgetSection),
    getWidgetFavorite: (widgetSection) => getWidgetFavorite(widgetSection),
    getWidgetSavePosition: (widgetSection) => getWidgetSavePosition(widgetSection),
    getWidgetLoadOrder: (widgetSection) => getWidgetLoadOrder(widgetSection),

    loadWidget: (section) => {return ipcRenderer.invoke('load-widget', section);},
    unloadWidget: (section) => {return ipcRenderer.invoke('unload-widget', section);},

    sendLog: (message, type, source = '') => ipcRenderer.send('log-message', message, type, source),
    getLogs: () => ipcRenderer.invoke('get-logs'),

    createLogsWindow: () => ipcRenderer.invoke('deskflex:createLogsWindow')
});