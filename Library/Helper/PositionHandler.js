const { startDesktopDetector } = require("desktop-detector");
const { EventEmitter } = require("events");

const desktopEvents = new EventEmitter();
let desktopDetectorProcess = null;
let isDesktopVisible = false;

const widgetList = []; // Track all widgets

function startDetectorOnce() {
  if (desktopDetectorProcess) return;

  desktopDetectorProcess = startDesktopDetector();

  desktopDetectorProcess.stdout.on("data", (data) => {
    const message = data.toString().trim().toLowerCase();

    if ((message.includes("(show desktop)") || message.includes("shown")) && !isDesktopVisible) {
      isDesktopVisible = true;
      desktopEvents.emit("desktop-shown");
    } else if ((message.includes("(apps restored via desktopmode)") || message.includes("apps shown")) && isDesktopVisible) {
      isDesktopVisible = false;
      desktopEvents.emit("apps-shown");
    }
  });

  desktopDetectorProcess.stderr.on("data", (data) => {
    console.error(`[desktop-detector-error]: ${data.toString().trim()}`);
  });

  desktopDetectorProcess.on("exit", (code) => {
    console.log(`[desktop-detector]: exited with code ${code}`);
    desktopDetectorProcess = null;
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

  startDetectorOnce(); // Ensure only one detector

  widgetList.push(win); // Add to list to maintain order

  // Show Desktop → Reorder widgets
  const onDesktopShown = () => {
    // Reset z-order based on load order
    widgetList.forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.setAlwaysOnTop(false); // Reset
      }
    });

    // Reapply alwaysOnTop in order — last one ends up on top
    widgetList.forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.setAlwaysOnTop(true);
      }
    });

    console.log(`[${widgetName}] Desktop shown → z-order reset (latest widget on top)`);
  };

  // Apps restored → remove all always-on-top
  const onAppsShown = () => {
    if (!win.isDestroyed()) {
      forceSetNotAlwaysOnTop(win);
      console.log(`[${widgetName}] Apps shown → setAlwaysOnTop(false)`);
    }
  };

  desktopEvents.on("desktop-shown", onDesktopShown);
  desktopEvents.on("apps-shown", onAppsShown);

  // Clean up on window close
  win.on("closed", () => {
    desktopEvents.off("desktop-shown", onDesktopShown);
    desktopEvents.off("apps-shown", onAppsShown);

    // Remove from list
    const index = widgetList.indexOf(win);
    if (index !== -1) widgetList.splice(index, 1);
  });
}

module.exports = { handleWindowPosition };
