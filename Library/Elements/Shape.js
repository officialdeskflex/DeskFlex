// Elements/Shape.js
const { safeInt, buildActionAttributes } = require("../Utils");

/**
 * Render a single shape element
 * @param {object} shape - Shape configuration object
 * @param {number} containerX - Container X offset
 * @param {number} containerY - Container Y offset
 * @param {number} index - Shape index for z-index layering
 * @returns {string} HTML string for the shape
 */
function renderSingleShape(shape, containerX, containerY, index = 0) {
  const x = safeInt(shape.x, 0) - containerX;
  const y = safeInt(shape.y, 0) - containerY;
  const width = safeInt(shape.w, 0);
  const height = safeInt(shape.h, 0);
  const fillColor = shape.fillcolor || "#FFFFFF";
  const strokeColor = shape.strokecolor || "#000000";
  const strokeWidth = safeInt(shape.strokewidth, 1);
  const radius = safeInt(shape.radius, 0);

  return `
    <div class="shape-layer" style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      box-sizing: border-box;
      background-color: ${fillColor};
      border: ${strokeWidth}px solid ${strokeColor};
      ${radius > 0 ? `border-radius: ${radius}px;` : ""}
      z-index: ${index};
    ">
    </div>`;
}

/**
 * Render shape widget with support for multiple shapes
 * @param {object} cfg - Widget configuration object
 * @returns {string} HTML string for the complete shape widget
 */
function renderShapeWidget(cfg) {
  const containerX = safeInt(cfg.x, 0);
  const containerY = safeInt(cfg.y, 0);
  const containerWidth = safeInt(cfg.w, 0);
  const containerHeight = safeInt(cfg.h, 0);

  const attrStr = buildActionAttributes(cfg);

  // Check if we have multiple shapes
  if (cfg.shapes && Array.isArray(cfg.shapes) && cfg.shapes.length > 0) {
    // Render multiple shapes
    const shapesHtml = cfg.shapes
      .map((shape, index) => renderSingleShape(shape, containerX, containerY, index))
      .join('');

    return `
    <div class="widget no-drag"${attrStr} style="
      position: absolute;
      left: ${containerX}px;
      top: ${containerY}px;
      width: ${containerWidth}px;
      height: ${containerHeight}px;
      box-sizing: border-box;
    ">
      ${shapesHtml}
    </div>`;
  } else {
    // Fallback to single shape rendering for backward compatibility
    const x = containerX;
    const y = containerY;
    const width = containerWidth;
    const height = containerHeight;
    const fillColor = cfg.fillcolor || "#FFFFFF";
    const strokeColor = cfg.strokecolor || "#000000";
    const strokeWidth = safeInt(cfg.strokewidth, 1);
    const radius = safeInt(cfg.radius, 0);

    return `
    <div class="widget no-drag"${attrStr} style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      box-sizing: border-box;
      background-color: ${fillColor};
      border: ${strokeWidth}px solid ${strokeColor};
      ${radius > 0 ? `border-radius: ${radius}px;` : ""}
    ">
    </div>`;
  }
}

module.exports = { renderShapeWidget, renderSingleShape };