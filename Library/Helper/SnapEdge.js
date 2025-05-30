const { screen } = require("electron");

function snapPosition(
  x,
  y,
  width,
  height,
  snapFlag,
  widgetWindows,
  currentKey,
  isCtrlPressed
) {
  const snapThreshold = Number(snapFlag) === 1 ? 100 : 0;
  if (!snapThreshold || isCtrlPressed) return { x, y };

  let bestX = x;
  let bestY = y;

  const display = screen.getDisplayNearestPoint({ x, y });
  const workArea = display.workArea;

  const windowRight = x + width;
  const windowBottom = y + height;

  if (Math.abs(x - workArea.x) <= snapThreshold) bestX = workArea.x;
  if (Math.abs(y - workArea.y) <= snapThreshold) bestY = workArea.y;
  if (Math.abs(windowRight - (workArea.x + workArea.width)) <= snapThreshold)
    bestX = workArea.x + workArea.width - width;
  if (Math.abs(windowBottom - (workArea.y + workArea.height)) <= snapThreshold)
    bestY = workArea.y + workArea.height - height;

  for (const [key, win] of widgetWindows) {
    if (key === currentKey || win.isDestroyed()) continue;

    const b = win.getBounds();
    const targetLeft = b.x;
    const targetRight = b.x + b.width;
    const targetTop = b.y;
    const targetBottom = b.y + b.height;

    const thisLeft = bestX;
    const thisRight = bestX + width;
    const thisTop = bestY;
    const thisBottom = bestY + height;

    if (thisBottom > targetTop && thisTop < targetBottom) {
      if (Math.abs(thisLeft - targetRight) <= snapThreshold)
        bestX = targetRight;
      else if (Math.abs(thisRight - targetLeft) <= snapThreshold)
        bestX = targetLeft - width;
    }

    if (thisRight > targetLeft && thisLeft < targetRight) {
      if (Math.abs(thisTop - targetBottom) <= snapThreshold)
        bestY = targetBottom;
      else if (Math.abs(thisBottom - targetTop) <= snapThreshold)
        bestY = targetTop - height;
    }
  }

  return { x: bestX, y: bestY };
}

module.exports = { snapPosition };
