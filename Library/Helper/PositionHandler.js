const { sendToBottom } = require("bottom-window");
const { startDesktopDetector } = require("desktop-detector");
const rw = require("restore-window");

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

 /* const sendThrottled = throttle(() => {
    sendToBottom(widgetName, (err, output) => {
      if (err) console.error("sendToBottom error:", err.message);
      else console.log("sent to bottom (throttled):", output);
    });
  }, throttleMs);

  win.on("move", sendThrottled);

  win.on("focus", () => {
    setTimeout(() => {
      sendToBottom(widgetName, (err, output) => {
        if (err) console.error("sendToBottom error:", err.message);
        else console.log("sent to bottom on focus:", output);
      });
    }, 100);
  });*/

  // Start desktop detector
  const detector = startDesktopDetector({ quiet: false });

  detector.stdout.on("data", (data) => {
    const message = data.toString().trim().toLowerCase();
    if (message.includes("(show desktop)")) {
      console.log("[desktop-detector]: Desktop is shown. Restoring window...");
      (async () => {
        try {
          const minimizeMsg = await rw.minimize(widgetName);
          console.log("[minimize-window]:", minimizeMsg);

          const restoreMsg = await rw.restore(widgetName);
          console.log("[restore-window]:", restoreMsg);
        } catch (err) {
          console.error("[restore-window-error]:", err.message);
        }
      })();
    }
  });

  // Kill detector when window is closed
  win.on("closed", () => {
    if (!detector.killed) {
      detector.kill();
    }
  });
}

module.exports = { attachPositionHandlers };
