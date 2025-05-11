//WidgetDrag.js
const { ipcRenderer } = require("electron");

(() => {
  const widgetName = document.body.dataset.widgetName;
  let dragging = false, start = {}, orig = {};

  const enforceSize = () => {
    const { width, height } = document.body.dataset;
    [document.documentElement.style, document.body.style].forEach(s => {
      Object.assign(s, { width: `${width}px`, height: `${height}px`, maxWidth: `${width}px`, maxHeight: `${height}px` });
    });
    const c = document.getElementById("container");
    if (c) Object.assign(c.style, { width: `${width}px`, height: `${height}px` });
    ipcRenderer.invoke("widget-reset-size", widgetName);
  };

  const isDraggable = () => document.body.dataset.draggable === "1";

  enforceSize();
  setInterval(enforceSize, 100);

  ipcRenderer.on("widget-draggable-changed", (_e, val) => {
    document.body.dataset.draggable = val ? "1" : "0";
  });

  document.addEventListener("mousedown", async e => {
    if (e.button || !isDraggable()) return;
    e.preventDefault();
    dragging = true;
    start = { x: e.screenX, y: e.screenY };
    const pos = await ipcRenderer.invoke("widget-get-position", widgetName);
    orig = { x: pos.x, y: pos.y };
    enforceSize();
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    e.preventDefault();
    const dx = e.screenX - start.x;
    const dy = e.screenY - start.y;
    ipcRenderer.send("widget-move-window", orig.x + dx, orig.y + dy, widgetName);
    enforceSize();
  });

  ["mouseup", "mouseleave", "keydown"].forEach(evt => {
    document.addEventListener(evt, e => {
      if (!dragging) return;
      if (evt === "keydown" && e.key !== "Escape") return;
      dragging = false;
      enforceSize();
    });
  });
})();
