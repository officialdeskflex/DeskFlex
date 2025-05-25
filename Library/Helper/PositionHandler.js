const { sendToBottom } = require("bottom-window");
const { startDesktopDetector } = require("desktop-detector");
let isDesktop = false;

function throttle(fn, wait) {
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

function handleDesktopEvents(win, message) {
  if (message.includes("(show desktop)") && !isDesktop) {
    console.log("[desktop-detector]: Desktop is shown. Restoring window...");
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(false);
      win.setAlwaysOnTop(true);
    }
    isDesktop = true;
  } else if (message.includes("(apps shown)") && isDesktop) {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(false);
    }
    isDesktop = false;
  }
}

/**
 * Attaches move/focus handlers & restores the window when desktop is shown.
 *
 * @param {BrowserWindow} win - Electron BrowserWindow
 * @param {string} widgetName - The window title for sendToBottom/restore
 * @param {number} position - Position from INI (e.g. -1 = bottom)
 * @param {number} [throttleMs=200] - Throttle interval
 */
function attachPositionHandlers(win, widgetName, position, throttleMs = 200) {
  if (position !== -1) return;

  /*const sendThrottled = throttle(() => {
    sendToBottom(widgetName, (err, output) => {
      if (err) console.error("sendToBottom error:", err.message);
      else console.log("sent to bottom (throttled):", output);
    });
  }, throttleMs);

  win.on("move", sendThrottled);*/

 /* win.on("focus", () => {
    setTimeout(() => {
      sendToBottom(widgetName, (err, output) => {
        if (err) console.error("sendToBottom error:", err.message);
        else console.log("sent to bottom on focus:", output);
      });
    }, 100);
  });*/

  const detector = startDesktopDetector({ quiet: false });

  detector.stdout.on("data", (data) => {
    const message = data.toString().trim().toLowerCase();
    handleDesktopEvents(win, message);
  });

  win.on("closed", () => {
    if (!detector.killed) {
      detector.kill();
    }
  });
}

module.exports = { attachPositionHandlers };
