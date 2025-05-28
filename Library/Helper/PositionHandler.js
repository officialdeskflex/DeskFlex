const { monitorDesktop } = require("isdesktop-visible"); 
const { EventEmitter } = require("events");

const desktopEvents = new EventEmitter();
let desktopMonitorProcess = null;
let isDesktopVisible = false;

const widgetList = [];

function startMonitorOnce() {
  if (desktopMonitorProcess) return;

  desktopMonitorProcess = monitorDesktop((state, rawLine) => {
    const message = rawLine.trim();

    if (state === "visible" && !isDesktopVisible) {
      isDesktopVisible = true;
      desktopEvents.emit("desktop-shown");
    } else if (state === "hidden" && isDesktopVisible) {
      isDesktopVisible = false;
      desktopEvents.emit("apps-shown");
    }
  });
}

function forceSetNotAlwaysOnTop(win) {
  if (!win || win.isDestroyed()) return;

  win.setAlwaysOnTop(false);
  const wasVisible = win.isVisible();
  win.minimize();

  setTimeout(() => {
    if (wasVisible && !win.isDestroyed()) {
      win.restore();
    }
    console.log(`[fix] Forced removal of AlwaysOnTop`);
  }, 200);
}

function handleWindowPosition(position, widgetName, win) {
  if (!win || win.isDestroyed()) return;

  if (position === 1) {
    win.setAlwaysOnTop(true);
    return;
  }

  startMonitorOnce();

  if (!widgetList.includes(win)) {
    widgetList.push(win);
  }

  const onDesktopShown = () => {
    widgetList.forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.setAlwaysOnTop(false);
      }
    });

    widgetList.forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.setAlwaysOnTop(true);
      }
    });

    console.log(`[${widgetName}] Desktop shown → z-order reset`);
  };

  const onAppsShown = () => {
    if (!win.isDestroyed()) {
      forceSetNotAlwaysOnTop(win);
      console.log(`[${widgetName}] Apps shown → setAlwaysOnTop(false)`);
    }
  };

  desktopEvents.on("desktop-shown", onDesktopShown);
  desktopEvents.on("apps-shown", onAppsShown);

  win.on("closed", () => {
    desktopEvents.off("desktop-shown", onDesktopShown);
    desktopEvents.off("apps-shown", onAppsShown);

    const index = widgetList.indexOf(win);
    if (index !== -1) widgetList.splice(index, 1);
  });
}

module.exports = { handleWindowPosition };
