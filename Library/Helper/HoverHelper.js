const { ipcRenderer } = require('electron');
const { getWindowGeometry } = require('win-geometry');

async function initializeHoverBehavior(container, hoverType, transparencyPercent, widgetPath) {
  const baseOpacity = (!isNaN(transparencyPercent) ? transparencyPercent / 100 : 1.0);
  container.style.transition = 'opacity 0.5s';

  function setOpacity(op) {
    ipcRenderer.send('widget-set-opacity', op);
    ipcRenderer.send('widget-set-ignore-mouse', op === 0);
    container.style.opacity = op;
  }

  setOpacity(baseOpacity);

  if (hoverType === 0) return;

  if (hoverType === 1) {
    let bounds;
    try {
      const g = await getWindowGeometry(widgetPath);
      bounds = { left: g.x, top: g.y, right: g.x + g.width, bottom: g.y + g.height };
    } catch {
      return;
    }
    let hidden = false;
    setInterval(async () => {
      const { x: mx, y: my } = await ipcRenderer.invoke('get-cursor-pos');
      const inside = mx >= bounds.left && mx <= bounds.right && my >= bounds.top && my <= bounds.bottom;
      if (inside && !hidden) {
        setOpacity(0);
        hidden = true;
      }
      if (!inside && hidden) {
        setOpacity(baseOpacity);
        hidden = false;
      }
    }, 100);

  } else if (hoverType === 2) {
    container.addEventListener('mouseenter', () => setOpacity(1.0));
    container.addEventListener('mouseleave', () => setOpacity(baseOpacity));

  } else if (hoverType === 3) {
    container.addEventListener('mouseenter', () => setOpacity(1.0));
    container.addEventListener('mouseleave', () => setOpacity(baseOpacity));
  }
}

module.exports = { initializeHoverBehavior };
