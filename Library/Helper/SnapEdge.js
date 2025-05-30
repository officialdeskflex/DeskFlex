const { screen } = require("electron");

const DEBUG = false;

function snapPosition(x, y, width, height, snapFlag, widgetWindows, currentKey) {
  const snapThreshold = Number(snapFlag) === 1 ? 120 : 0;
  if (!snapThreshold) return { x, y };

  let bestX = x;
  let bestY = y;

  // Get current screen work area
  const display = screen.getDisplayNearestPoint({ x, y });
  const workArea = display.workArea;

  const windowRight = x + width;
  const windowBottom = y + height;

  // Screen edge snapping
  if (Math.abs(x - workArea.x) <= snapThreshold) bestX = workArea.x;
  if (Math.abs(y - workArea.y) <= snapThreshold) bestY = workArea.y;
  if (Math.abs(windowRight - (workArea.x + workArea.width)) <= snapThreshold)
    bestX = workArea.x + workArea.width - width;
  if (Math.abs(windowBottom - (workArea.y + workArea.height)) <= snapThreshold)
    bestY = workArea.y + workArea.height - height;

  // Widget edge snapping
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

    // Snap horizontally (avoid overlap)
    if (
      (thisBottom > targetTop && thisTop < targetBottom) // vertical overlap
    ) {
      // Snap left edge to right edge
      if (Math.abs(thisLeft - targetRight) <= snapThreshold)
        bestX = targetRight;

      // Snap right edge to left edge
      else if (Math.abs(thisRight - targetLeft) <= snapThreshold)
        bestX = targetLeft - width;
    }

    // Snap vertically (avoid overlap)
    if (
      (thisRight > targetLeft && thisLeft < targetRight) // horizontal overlap
    ) {
      // Snap top edge to bottom edge
      if (Math.abs(thisTop - targetBottom) <= snapThreshold)
        bestY = targetBottom;

      // Snap bottom edge to top edge
      else if (Math.abs(thisBottom - targetTop) <= snapThreshold)
        bestY = targetTop - height;
    }
  }

  return { x: bestX, y: bestY };
}

module.exports = { snapPosition };
