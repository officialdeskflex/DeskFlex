const { startDesktopDetector } = require("desktop-detector");

function forceSetNotAlwaysOnTop(win) {
  win.setAlwaysOnTop(false);
  const wasVisible = win.isVisible();
  win.minimize();

  setTimeout(() => {
    if (wasVisible) {
      win.restore();
    }
    console.log(`[fix] Forced removal of AlwaysOnTop`);
  }, 200); 
}

function handleWindowPosition(position, widgetName, win) {
  if (position !== 0) return;

  let isDesktopVisible = false;

  const proc = startDesktopDetector();

  proc.stdout.on("data", (data) => {
    const message = data.toString().trim().toLowerCase();

    if ((message.includes("(show desktop)") || message.includes("shown")) && !isDesktopVisible) {
      isDesktopVisible = true;
      win.setAlwaysOnTop(false); // Reset first
      win.setAlwaysOnTop(true); // Force on top
      console.log(`[${widgetName}] Desktop shown → setAlwaysOnTop(true)`);
    } else if ((message.includes("(apps restored via desktopmode)") || message.includes("apps shown")) && isDesktopVisible) {
      isDesktopVisible = false;

      forceSetNotAlwaysOnTop(win); 
      console.log(`[${widgetName}] Apps shown → setAlwaysOnTop(false)`);
    }
  });

  proc.stderr.on("data", (data) => {
    console.error(`[desktop-detector-error]: ${data.toString().trim()}`);
  });

  proc.on("exit", (code) => {
    console.log(`[desktop-detector]: exited with code ${code}`);
  });

  win.on("closed", () => {
    proc.kill();
  });
}

module.exports = { handleWindowPosition };
