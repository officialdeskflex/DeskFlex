// HoverHelper.js
const { ipcRenderer } = require('electron');
const { getWindowGeometry } = require('win-geometry');

let ctrlPressed = false;
window.addEventListener('keydown', e => { if (e.key === 'Control') ctrlPressed = true; });
window.addEventListener('keyup',   e => { if (e.key === 'Control') ctrlPressed = false; });

async function initializeHoverBehavior(container, initialHoverType, transparencyPercent, widgetPath) {
  let hoverType = Number(initialHoverType);
  let baseOpacity = (!isNaN(transparencyPercent) ? transparencyPercent / 100 : 1.0);
  let hoverInterval = null;
  let hidden = false;
  const listeners = [];

  container.style.transition = 'opacity 0.5s ease';

  function setOpacity(op) {
    op = Math.max(0, Math.min(1, op));
    ipcRenderer.send('widget-set-opacity', op);
    ipcRenderer.send('widget-set-ignore-mouse', op === 0);
    container.style.opacity = op;
  }

  function cleanup() {
    if (hoverInterval) {
      clearInterval(hoverInterval);
      hoverInterval = null;
    }
    listeners.forEach(({event, handler}) => {
      container.removeEventListener(event, handler);
    });
    listeners.length = 0;
    hidden = false;
  }

  setOpacity(baseOpacity);

  if (!initializeHoverBehavior.ipcInitialized) {
    ipcRenderer.on('widget-set-hoverType', async (_e, newType) => {
      hoverType = Number(newType);
      console.log(`Hover type changed to ${hoverType}`);
      cleanup();
      applyHoverLogic();
    });

    ipcRenderer.on('widget-transparency-changed', (_e, newOpacityPct) => {
      const parsed = parseFloat(newOpacityPct);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        baseOpacity = parsed / 100;
        setOpacity(hidden ? 0 : baseOpacity);
      }
    });

    initializeHoverBehavior.ipcInitialized = true;
  }

  async function applyHoverLogic() {

    if (hoverType === 0) return;

    if (hoverType === 1) {
      let bounds;
      try {
        const g = await getWindowGeometry(widgetPath);
        bounds = { left: g.x, top: g.y, right: g.x + g.width, bottom: g.y + g.height };
      } catch (err) {
        console.error('Failed to get window geometry:', err);
        return;
      }
      hoverInterval = setInterval(async () => {
        if (ctrlPressed) return;
        const { x: mx, y: my } = await ipcRenderer.invoke('get-cursor-pos');
        const inside = mx >= bounds.left && mx <= bounds.right && my >= bounds.top && my <= bounds.bottom;
        if (inside && !hidden) {
          setOpacity(0);
          hidden = true;
        } else if (!inside && hidden) {
          setOpacity(baseOpacity);
          hidden = false;
        }
      }, 100);

    } else if (hoverType === 2) {
      const enter = e => {
        if (ctrlPressed || e.ctrlKey) return;
        setOpacity(1);
      };
      const leave = e => {
        if (ctrlPressed || e.ctrlKey) return;
        setOpacity(baseOpacity);
      };
      container.addEventListener('mouseenter', enter);
      container.addEventListener('mouseleave', leave);
      listeners.push({event: 'mouseenter', handler: enter});
      listeners.push({event: 'mouseleave', handler: leave});

    } else if (hoverType === 3) {
      const enter = e => {
        if (ctrlPressed || e.ctrlKey) return;
        setOpacity(0.1);
      };
      const leave = e => {
        if (ctrlPressed || e.ctrlKey) return;
        setOpacity(baseOpacity);
      };
      container.addEventListener('mouseenter', enter);
      container.addEventListener('mouseleave', leave);
      listeners.push({event: 'mouseenter', handler: enter});
      listeners.push({event: 'mouseleave', handler: leave});
    }
  }

  applyHoverLogic();
}

module.exports = { initializeHoverBehavior };