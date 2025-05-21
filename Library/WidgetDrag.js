//WidgetDrag.js
const { ipcRenderer } = require("electron");

(() => {
  const widgetName = document.body.dataset.widgetName;
  let dragging = false;
  let start = {};
  let orig = {};
  let lastMoveTime = 0;
  const THROTTLE_MS = 16; // ~60fps

  const enforceSize = () => {
    const { width, height } = document.body.dataset;
    [document.documentElement.style, document.body.style].forEach(s => {
      Object.assign(s, {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: `${width}px`,
        maxHeight: `${height}px`
      });
    });
    const c = document.getElementById("container");
    if (c) Object.assign(c.style, { width: `${width}px`, height: `${height}px` });
    // Only reset size when not dragging to avoid IPC thrashing
    if (!dragging) {
      ipcRenderer.invoke("widget-reset-size", widgetName);
    }
  };

  const isDraggable = () => document.body.dataset.draggable === "1";

  // Initial size enforcement
  enforceSize();
  // Periodic size enforcement at low frequency
  setInterval(() => {
    if (!dragging) enforceSize();
  }, 15000);

  // Update draggable state from main process
  ipcRenderer.on("widget-draggable-changed", (_e, val) => {
    document.body.dataset.draggable = val ? "1" : "0";
  });

  document.addEventListener("mousedown", async e => {
    if (e.button !== 0 || !isDraggable()) return;
    e.preventDefault();
    dragging = true;
    start = { x: e.screenX, y: e.screenY };
    const pos = await ipcRenderer.invoke("widget-get-position", widgetName);
    orig = { x: pos.x, y: pos.y };
    // Visual feedback during drag
    document.body.style.cursor = "grabbing";
    enforceSize();
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    const now = Date.now();
    if (now - lastMoveTime < THROTTLE_MS) return;
    lastMoveTime = now;
    e.preventDefault();
    const dx = e.screenX - start.x;
    const dy = e.screenY - start.y;
    ipcRenderer.send("widget-move-window-drag", orig.x + dx, orig.y + dy, widgetName);
    // Removed enforceSize here to reduce CPU usage
  });

  const endDrag = async e => {
    if (!dragging) return;
    if (e.type === "keydown" && e.key !== "Escape") return;
    dragging = false;
    document.body.style.cursor = "default";
    enforceSize();
    ipcRenderer.send("widget-save-window-position", widgetName);
  };

  // Listen globally to finalize drag
  window.addEventListener("mouseup", endDrag);
  window.addEventListener("mouseleave", endDrag);
  window.addEventListener("keydown", endDrag);
})();
