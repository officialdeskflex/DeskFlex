/**
 * Convert cap type to SVG linecap value
 * @param {string} capType - Cap type (flat, round, square, triangle)
 * @returns {string} SVG linecap value
 */
function convertCapToSvg(capType) {
  switch (capType.toLowerCase()) {
    case "round":
      return "round";
    case "square":
      return "square";
    case "triangle":
      return "butt"; // Use butt for sharp triangle-like points
    case "flat":
    default:
      return "butt";
  }
}

/**
 * Convert join type to SVG linejoin value
 * @param {string} joinType - Join type (miter, bevel, round, miterorbevel)
 * @returns {string} SVG linejoin value
 */
function convertJoinToSvg(joinType) {
  switch (joinType.toLowerCase()) {
    case "round":
      return "round";
    case "bevel":
      return "bevel";
    case "miter":
    case "miterorbevel":
    default:
      return "miter";
  }
}

/**
 * Build stroke dash array attribute
 * @param {Array} strokeDashes - Array of dash values
 * @param {number} strokeWidth - Stroke width for scaling
 * @returns {string} Stroke dash array attribute string
 */
function buildStrokeDashArray(strokeDashes, strokeWidth = 1) {
  if (!strokeDashes || strokeDashes.length === 0) {
    return "";
  }
  const dashValues = strokeDashes.map((val) => val * strokeWidth);
  return `stroke-dasharray="${dashValues.join(",")}"`;
}

/**
 * Build stroke dash offset attribute
 * @param {number} dashOffset - Dash offset value
 * @param {number} strokeWidth - Stroke width for scaling
 * @returns {string} Stroke dash offset attribute string
 */
function buildStrokeDashOffset(dashOffset, strokeWidth = 1) {
  if (dashOffset === 0 || dashOffset == null) {
    return "";
  }
  return `stroke-dashoffset="${dashOffset * strokeWidth}"`;
}

/**
 * Build complete stroke attributes for SVG elements
 * @param {object} shape - Shape configuration object
 * @returns {object} Object containing stroke attributes
 */
function buildStrokeAttributes(shape) {
  const strokeColor = shape.strokecolor || "#000000";
  const strokeWidth = parseInt(shape.strokewidth) || 1;
  const startCap = shape.strokestartcap || "flat";
  const endCap = shape.strokeendcap || "flat";
  const lineJoin = shape.strokelinejoin || "miter";
  const miterLimit = shape.strokemiterlimit || 10.0;

  const dashArray = buildStrokeDashArray(shape.strokedashes, strokeWidth);
  const dashOffset = buildStrokeDashOffset(shape.strokedashoffset, strokeWidth);

  return {
    stroke: strokeColor,
    strokeWidth: strokeWidth,
    strokeLinecap: convertCapToSvg(startCap),
    strokeLinejoin: convertJoinToSvg(lineJoin),
    strokeMiterlimit: lineJoin === "miter" ? miterLimit : null,
    dashArray: dashArray,
    dashOffset: dashOffset,
    startCap: startCap,
    endCap: endCap,
  };
}

/**
 * Generate stroke attribute string for SVG elements
 * @param {object} strokeAttrs - Stroke attributes object
 * @returns {string} Complete stroke attribute string
 */
function generateStrokeAttributeString(strokeAttrs) {
  const parts = [
    `stroke="${strokeAttrs.stroke}"`,
    `stroke-width="${strokeAttrs.strokeWidth}"`,
    `stroke-linecap="${strokeAttrs.strokeLinecap}"`,
    `stroke-linejoin="${strokeAttrs.strokeLinejoin}"`,
  ];

  if (strokeAttrs.strokeMiterlimit !== null) {
    parts.push(`stroke-miterlimit="${strokeAttrs.strokeMiterlimit}"`);
  }

  if (strokeAttrs.dashArray) {
    parts.push(strokeAttrs.dashArray);
  }

  if (strokeAttrs.dashOffset) {
    parts.push(strokeAttrs.dashOffset);
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * Check if a shape requires SVG rendering based on stroke properties
 * @param {object} shape - Shape object
 * @returns {boolean} True if SVG rendering is required for stroke features
 */
function requiresSvgForStroke(shape) {
  return (
    shape.strokestartcap === "triangle" ||
    shape.strokeendcap === "triangle" ||
    shape.strokestartcap !== "flat" ||
    shape.strokeendcap !== "flat" ||
    shape.strokedashcap !== "flat" ||
    (shape.strokedashes !== null &&
      shape.strokedashes &&
      shape.strokedashes.length > 2) ||
    shape.strokelinejoin !== "miter" ||
    (shape.strokemiterlimit && shape.strokemiterlimit !== 10.0) ||
    (shape.strokedashoffset && shape.strokedashoffset !== 0)
  );
}

/**
 * Get CSS border style based on stroke dashes
 * @param {Array} strokeDashes - Array of dash values
 * @returns {string} CSS border style (solid, dashed, dotted)
 */
function getCssBorderStyle(strokeDashes) {
  if (!strokeDashes || strokeDashes.length === 0) {
    return "solid";
  }

  // Simple heuristic: if all dash values are small and equal, use dotted
  if (
    strokeDashes.length === 2 &&
    strokeDashes[0] === strokeDashes[1] &&
    strokeDashes[0] <= 2
  ) {
    return "dotted";
  }

  return "dashed";
}

/**
 * Calculate triangle cap extension points for lines
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {string} startCap - Start cap style
 * @param {string} endCap - End cap style
 * @param {number} strokeWidth - Stroke width
 * @returns {object} Object with extended line coordinates and triangle parameters
 */
function calculateTriangleCapPoints(
  x1,
  y1,
  x2,
  y2,
  startCap,
  endCap,
  strokeWidth
) {
  const hasTriangleStart = startCap === "triangle";
  const hasTriangleEnd = endCap === "triangle";

  if (!hasTriangleStart && !hasTriangleEnd) {
    return {
      startX: x1,
      startY: y1,
      endX: x2,
      endY: y2,
      hasTriangleStart: false,
      hasTriangleEnd: false,
    };
  }

  // Calculate line angle and perpendicular
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const unitX = dx / length;
  const unitY = dy / length;
  const perpX = -unitY;
  const perpY = unitX;

  const halfStroke = strokeWidth / 2;
  const triangleLength = strokeWidth; // How far the triangle extends

  let startX = x1,
    startY = y1;
  let endX = x2,
    endY = y2;

  // Extend line for triangle caps
  if (hasTriangleStart) {
    startX = x1 - unitX * triangleLength;
    startY = y1 - unitY * triangleLength;
  }

  if (hasTriangleEnd) {
    endX = x2 + unitX * triangleLength;
    endY = y2 + unitY * triangleLength;
  }

  return {
    startX,
    startY,
    endX,
    endY,
    unitX,
    unitY,
    perpX,
    perpY,
    halfStroke,
    triangleLength,
    hasTriangleStart,
    hasTriangleEnd,
    originalX1: x1,
    originalY1: y1,
    originalX2: x2,
    originalY2: y2,
  };
}

module.exports = {
  convertCapToSvg,
  convertJoinToSvg,
  buildStrokeDashArray,
  buildStrokeDashOffset,
  buildStrokeAttributes,
  generateStrokeAttributeString,
  requiresSvgForStroke,
  getCssBorderStyle,
  calculateTriangleCapPoints,
};
