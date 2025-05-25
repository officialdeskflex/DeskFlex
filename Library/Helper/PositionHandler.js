const { sendToBottom } = require("bottom-window");
const {
  addWindow,
  removeWindow,
  isDesktopShown,
} = require("./DesktopWatcher");

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

function attachPositionHandlers(win, widgetName, position, throttleMs = 200) {
  if (position !== -1) return;

  const sendThrottled = throttle(() => {
    if (isDesktopShown()) {
      sendToBottom(widgetName, (err, output) => {
        if (err) console.error("sendToBottom error:", err.message);
        else console.log("sent to bottom (throttled):", output);
      });
    }
  }, throttleMs);

  win.on("move", sendThrottled);

  win.on("focus", () => {
    if (isDesktopShown()) {
      setTimeout(() => {
        sendToBottom(widgetName, (err, output) => {
          if (err) console.error("sendToBottom error:", err.message);
          else console.log("sent to bottom on focus:", output);
        });
      }, 100);
    }
  });

  addWindow(win);

  win.on("closed", () => {
    removeWindow(win);
  });
}

module.exports = { attachPositionHandlers };
