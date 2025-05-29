const { monitorDesktop } = require("isdesktop-visible");
const { EventEmitter } = require("events");

const desktopEvents = new EventEmitter();
const widgetList = new Map(); 
let desktopMonitorProcess = null;
let isDesktopVisible = false;

function startDesktopMonitor() {
  if (desktopMonitorProcess) return;

  desktopMonitorProcess = monitorDesktop((state, rawLine) => {
    const message = rawLine.trim(); 
    const becameVisible = state === "visible";
    const becameHidden = state === "hidden";

    if (becameVisible && !isDesktopVisible) {
      isDesktopVisible = true;
      desktopEvents.emit("desktop-shown");
    } else if (becameHidden && isDesktopVisible) {
      isDesktopVisible = false;
      desktopEvents.emit("apps-shown");
    }
  });
}

function forceRemoveAlwaysOnTop(win) {
  if (!win || win.isDestroyed()) return;

  win.setAlwaysOnTop(false);
  const shouldRestore = win.isVisible();
  win.minimize();

  setTimeout(() => {
    if (shouldRestore && !win.isDestroyed()) {
      win.restore();
    }
    console.log("[fix] Forced removal of AlwaysOnTop");
  }, 200);
}

function attachEventHandlers(win, widgetName) {
  const onDesktopShown = () => {
    widgetList.forEach((_, widgetWin) => {
      if (!widgetWin.isDestroyed()) {
        widgetWin.setAlwaysOnTop(false);
        widgetWin.setAlwaysOnTop(true);
      }
    });
    console.log(`[${widgetName}] Desktop shown → z-order reset`);
  };

  const onAppsShown = () => {
    if (!win.isDestroyed()) {
      forceRemoveAlwaysOnTop(win);
      console.log(`[${widgetName}] Apps shown → setAlwaysOnTop(false)`);
    }
  };

  desktopEvents.on("desktop-shown", onDesktopShown);
  desktopEvents.on("apps-shown", onAppsShown);

  return { onDesktopShown, onAppsShown };
}

/**
 * Main function to handle widget window z-order behavior.
 */
function handleWindowPosition(position, widgetName, win, update = false) {
  if (!win || win.isDestroyed()) return;

  if (update && widgetList.has(win)) {
    const { handlers, position: prevPosition } = widgetList.get(win);

    if (prevPosition === 1 && position === 0) {
      win.setAlwaysOnTop(false);
    }

    if (handlers.onDesktopShown) {
      desktopEvents.off("desktop-shown", handlers.onDesktopShown);
    }
    if (handlers.onAppsShown) {
      desktopEvents.off("apps-shown", handlers.onAppsShown);
    }
  }

  if (position === 1) {
    win.setAlwaysOnTop(true);
    widgetList.set(win, { position, handlers: { onDesktopShown: null, onAppsShown: null } });
    return;
  }

  startDesktopMonitor();
  const handlers = attachEventHandlers(win, widgetName);

  widgetList.set(win, { position, handlers });

  if (!update) {
    win.on("closed", () => {
      const record = widgetList.get(win);
      if (record) {
        if (record.handlers.onDesktopShown) {
          desktopEvents.off("desktop-shown", record.handlers.onDesktopShown);
        }
        if (record.handlers.onAppsShown) {
          desktopEvents.off("apps-shown", record.handlers.onAppsShown);
        }
        widgetList.delete(win);
      }
    });
  }
}

function updateWindowPosition(position, widgetName, win) {
  console.log(`Window position updated to ${position}`);
  handleWindowPosition(position, widgetName, win, true);
}

module.exports = {
  handleWindowPosition,
  updateWindowPosition,
};
