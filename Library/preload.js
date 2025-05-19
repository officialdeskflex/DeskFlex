// preload.js
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const {
  getDarkMode, getFolderStructure, getActiveWidgets,
  getWidgetsPath, getWidgetStatus, getWidgetWindowX, getWidgetWindowY,
  getWidgetPosition, getWidgetClickthrough, getWidgetDraggable,
  getWidgetSnapEdges, getWidgetKeepOnScreen, getWidgetOnHover,
  getWidgetTransparency, getWidgetFavorite, getWidgetSavePosition,
  getWidgetLoadOrder, setActiveValue, setIniValue
} = require('./ConfigFile');
const { getWidgetInfo, hasWidgetInfoSection } = require('./ReadInfoSection');

contextBridge.exposeInMainWorld('deskflex', {

  darkMode: getDarkMode(),
  folderStructure: getFolderStructure(),
  activeWidget: () => getActiveWidgets(),
  widgetPath: getWidgetsPath(),
  settingsFile: path.join(process.env.APPDATA, "DeskFlex", "DeskFlex.ini"),

  openConfigSettings: filePath => ipcRenderer.send('open-config-settings', filePath),
  hideWindow: () => ipcRenderer.send('hide-window'),

  getWidgetInfo: filePath => getWidgetInfo(filePath),
  hasWidgetInfoSection: filePath => hasWidgetInfoSection(filePath),
  setActiveValue: (widgetName, value) => setActiveValue(widgetName, value),
  setIniValue: (widgetName, key, value) => setIniValue(widgetName, key, value),

  getWidgetStatus: name => getWidgetStatus(name),
  getWidgetWindowX: name => getWidgetWindowX(name),
  getWidgetWindowY: name => getWidgetWindowY(name),
  getWidgetPosition: name => getWidgetPosition(name),
  getWidgetClickthrough: name => getWidgetClickthrough(name),
  getWidgetDraggable: name => getWidgetDraggable(name),
  getWidgetSnapEdges: name => getWidgetSnapEdges(name),
  getWidgetKeepOnScreen: name => getWidgetKeepOnScreen(name),
  getWidgetOnHover: name => getWidgetOnHover(name),
  getWidgetTransparency: name => getWidgetTransparency(name),
  getWidgetFavorite: name => getWidgetFavorite(name),
  getWidgetSavePosition: name => getWidgetSavePosition(name),
  getWidgetLoadOrder: name => getWidgetLoadOrder(name),

  draggableWidget: (val, widgetId) => ipcRenderer.send("widget-set-draggable", val, widgetId),
  clickThroughWidget:(val, widgetId) => ipcRenderer.send("widget-set-clickthrough", val, widgetId),
  savePositionWidget:(val, widgetId) => ipcRenderer.send("widget-move-window", val, widgetId),
  keepOnScreen:(val, widgetId) => ipcRenderer.send("widget-move-window", val, widgetId),

  onDraggableChange: cb => ipcRenderer.on('widget-draggable-changed', (_e, data) => cb(data)),
  onKeepOnScreenChange: cb => ipcRenderer.on('widget-keep-on-screen-changed', (_e, data) => cb(data)),
  onClickthroughChange: cb => ipcRenderer.on('widget-clickthrough-changed', (_e, data) => cb(data)),

  setOpacity: (opacity, widgetId) => ipcRenderer.send("widget-set-opacity", opacity, widgetId),
  setDraggable: (enabled, widgetId) => ipcRenderer.send("widget-set-draggable", enabled ? 1 : 0, widgetId),
  setKeepOnScreen: (enabled, widgetId) => ipcRenderer.send("widget-set-keep-on-screen", enabled ? 1 : 0, widgetId),
  setTransparency: (percent, widgetId) => ipcRenderer.send("widget-set-transparency", percent, widgetId),
  setClickthrough: (enabled, widgetId) => ipcRenderer.send("widget-set-clickthrough", enabled ? 1 : 0, widgetId),

  loadWidget: name => ipcRenderer.invoke('load-widget', name),
  unloadWidget: name => ipcRenderer.invoke('unload-widget', name),
  toggleWidget: name => ipcRenderer.invoke('widget-toggle-widget', name),
  isWidgetLoaded: name => ipcRenderer.invoke('widget-is-widget-loaded', name),

  sendLog: (msg, type, source = '') => ipcRenderer.send('log-message', msg, type, source),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearAllLogs: () => ipcRenderer.invoke('clear-logs'),
  createLogsWindow: () => ipcRenderer.invoke('deskflex:createLogsWindow'),

  onWidgetStatusChanged: cb => ipcRenderer.on('widget-status-changed', (_e, id) => cb(id)),
  onPositionChanged: cb => ipcRenderer.on('widget-position-changed', (_e, data) => cb(data)),
  onPositionSaved: cb => ipcRenderer.on('widget-position-saved', (_e, data) => cb(data)),
  onSizeReset: cb => ipcRenderer.on('widget-size-reset', (_e, data) => cb(data)),
  onTransparencyChange: cb => ipcRenderer.on('widget-transparency-changed', (_e, data) => cb(data)),
  onWidgetLoaded: cb => ipcRenderer.on('widget-loaded', (_e, data) => cb(data)),
  onWidgetUnloaded: cb => ipcRenderer.on('widget-unloaded', (_e, data) => cb(data)),
  onWidgetToggled: cb => ipcRenderer.on('widget-toggled', (_e, data) => cb(data)),
});