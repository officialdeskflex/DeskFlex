// WidgetDrag.js
const { ipcRenderer } = require("electron");

(function () {
  const section     = document.body.dataset.section;
  let dragging      = false,
      startX        = 0,
      startY        = 0,
      origX         = 0,
      origY         = 0;

  function enforceSize() {
    const w = document.body.dataset.width + "px";
    const h = document.body.dataset.height + "px";
    Object.assign(document.documentElement.style, { width: w, height: h });
    Object.assign(document.body.style,         { width: w, height: h, maxWidth: w, maxHeight: h });
    const c = document.getElementById("container");
    if (c) Object.assign(c.style, { width: w, height: h });
    ipcRenderer.invoke("widget-reset-size", section);
  }

  enforceSize();
  setInterval(enforceSize, 100);

  function isDraggable() {
    return document.body.dataset.draggable === "1";
  }

  // update draggable at runtime
  ipcRenderer.on("widget-draggable-changed", (_e, val) => {
    document.body.dataset.draggable = val ? "1" : "0";
  });

  document.addEventListener("mousedown", e => {
    if (e.button !== 0 || !isDraggable()) return;
    e.preventDefault();
    dragging = true;
    startX   = e.screenX;
    startY   = e.screenY;
    ipcRenderer.invoke("widget-get-position", section).then(pos => {
      origX = pos.x; origY = pos.y;
      enforceSize();
    });
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    e.preventDefault();
    const dx = e.screenX - startX, dy = e.screenY - startY;
    ipcRenderer.send("widget-move-window", origX + dx, origY + dy, section);
    enforceSize();
  });

  ["mouseup","mouseleave"].forEach(evt =>
    document.addEventListener(evt, e => {
      if (dragging) {
        dragging = false;
        enforceSize();
      }
    })
  );

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && dragging) {
      dragging = false;
      enforceSize();
    }
  });
})();
