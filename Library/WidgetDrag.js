const { ipcRenderer } = require("electron");

(function () {
  const section     = document.body.dataset.section;
  const isDraggable = document.body.dataset.draggable === "1";
  const fixedWidth  = parseInt(document.body.dataset.width, 10);
  const fixedHeight = parseInt(document.body.dataset.height, 10);

  function enforceSize() {
    document.documentElement.style.width      = fixedWidth  + "px";
    document.documentElement.style.height     = fixedHeight + "px";
    document.body.style.width                 = fixedWidth  + "px";
    document.body.style.height                = fixedHeight + "px";
    document.body.style.maxWidth              = fixedWidth  + "px";
    document.body.style.maxHeight             = fixedHeight + "px";

    const container = document.getElementById("container");
    if (container) {
      container.style.width  = fixedWidth  + "px";
      container.style.height = fixedHeight + "px";
    }

    ipcRenderer.invoke("widget-reset-size", section);
  }

  enforceSize();
  setInterval(enforceSize, 100);

  if (!isDraggable) return;

  let dragging = false,
      startX   = 0,
      startY   = 0,
      origX    = 0,
      origY    = 0;

  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX   = e.screenX;
    startY   = e.screenY;

    ipcRenderer.invoke("widget-get-position", section).then((pos) => {
      origX = pos.x;
      origY = pos.y;
      enforceSize();
    });
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    e.preventDefault();
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    ipcRenderer.send("widget-move-window", origX + dx, origY + dy, section);
    enforceSize();
  });

  document.addEventListener("mouseup", (e) => {
    if (!dragging) return;
    e.preventDefault();
    dragging = false;
    enforceSize();
  });

  document.addEventListener("mouseleave", () => {
    if (dragging) {
      dragging = false;
      enforceSize();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dragging) {
      dragging = false;
      enforceSize();
    }
  });
})();
