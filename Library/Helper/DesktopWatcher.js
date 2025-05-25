// desktopWatcher.js
const { startDesktopDetector } = require("desktop-detector");

let detector = null;
const windows = new Set();
let isDesktop = false;

function startWatcher() {
  if (detector) return;

  detector = startDesktopDetector({ quiet: false });

  detector.stdout.on("data", (data) => {
    const message = data.toString().trim().toLowerCase();
    if (message.includes("(show desktop)") && !isDesktop) {
      console.log("[desktop-detector]: Desktop is shown. Restoring windows...");
      isDesktop = true;
      restoreWindows();
    } else if (message.includes("(apps shown)") && isDesktop) {
      console.log("[desktop-detector]: Apps are shown. Removing always-on-top...");
      isDesktop = false;
      lowerWindows();
    }
  });

  detector.on("exit", () => {
    detector = null;
  });
}

function addWindow(win) {
  if (!win || win.isDestroyed()) return;
  windows.add(win);
  startWatcher();
}

function removeWindow(win) {
  windows.delete(win);
}

function restoreWindows() {
  let delay = 0;
  for (const win of windows) {
    if (!win.isDestroyed()) {
      setTimeout(() => {
        win.setAlwaysOnTop(false);
        win.setAlwaysOnTop(true);
      }, delay);
      delay += 100; 
    }
  }
}

function lowerWindows() {
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(false);
    }
  }
}

function isDesktopShown() {
  return isDesktop;
}

module.exports = {
  addWindow,
  removeWindow,
  isDesktopShown,
};
