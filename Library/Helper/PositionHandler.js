const { sendToBottom } = require('bottom-window');

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
 * Attaches move and focus handlers to keep the window at bottom when position = -1
 * @param {BrowserWindow} win - The Electron BrowserWindow instance
 * @param {string} widgetName - The window title or identifier for sendToBottom
 * @param {number} position - The Position value from the INI
 * @param {number} [throttleMs=200] - Throttle interval in milliseconds
 */
function attachPositionHandlers(win, widgetName, position, throttleMs = 200) {
  if (position !== -1) return;

  const sendThrottled = throttle(() => {
    sendToBottom(widgetName, (err, output) => {
      if (err) console.error('sendToBottom error:', err.message);
      else console.log('sent to bottom (throttled):', output);
    });
  }, throttleMs);

  win.on('move', sendThrottled);

  win.on('focus', () => {
    setTimeout(() => {
      sendToBottom(widgetName, (err, output) => {
        if (err) console.error('sendToBottom error:', err.message);
        else console.log('sent to bottom on focus:', output);
      });
    }, 100);
  });
}

module.exports = { attachPositionHandlers };