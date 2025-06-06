const { safeInt, buildActionAttributes } = require("../Utils");
const { buildTransformString } = require("./ShapeUtils/BuildTransform");
const {
  buildStrokeAttributes,
  generateStrokeAttributeString,
  requiresSvgForStroke,
  getCssBorderStyle,
  calculateTriangleCapPoints,
} = require("./ShapeUtils/Stroke");

/**
 * Generate SVG path for rectangle with rounded corners and optional sharp endpoints
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} radius - Border radius
 * @param {string} startCap - Start cap style
 * @param {string} endCap - End cap style
 * @param {number} strokeWidth - Stroke width for triangle calculations
 * @returns {string} SVG path string
 */
function generateRectPath(
  x,
  y,
  width,
  height,
  radius,
  startCap = "flat",
  endCap = "flat",
  strokeWidth = 1
) {
  // For rectangle shapes, we'll modify the corners to create sharp points when triangle caps are used
  const hasTriangleStart = startCap === "triangle";
  const hasTriangleEnd = endCap === "triangle";

  if (radius === 0 && !hasTriangleStart && !hasTriangleEnd) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${
      y + height
    } L ${x} ${y + height} Z`;
  }

  const r = Math.min(radius, width / 2, height / 2);
  const triangleOffset = strokeWidth / 2; // How much to extend for triangle effect

  const startX = hasTriangleStart ? x - triangleOffset : x;
  const endX = hasTriangleEnd ? x + width + triangleOffset : x + width;

  if (radius === 0) {
    return `
      M ${startX + (hasTriangleStart ? triangleOffset : 0)} ${y}
      L ${endX - (hasTriangleEnd ? triangleOffset : 0)} ${y}
      ${
        hasTriangleEnd
          ? `L ${endX} ${y + height / 2} L ${endX - triangleOffset} ${
              y + height
            }`
          : `L ${endX} ${y + height}`
      }
      L ${startX + (hasTriangleStart ? triangleOffset : 0)} ${y + height}
      ${
        hasTriangleStart
          ? `L ${startX} ${y + height / 2} L ${startX + triangleOffset} ${y}`
          : `L ${startX} ${y}`
      }
      Z
    `;
  }

  // Rounded rectangle path (triangle caps don't apply well to rounded rectangles)
  return `
    M ${x + r} ${y}
    L ${x + width - r} ${y}
    Q ${x + width} ${y} ${x + width} ${y + r}
    L ${x + width} ${y + height - r}
    Q ${x + width} ${y + height} ${x + width - r} ${y + height}
    L ${x + r} ${y + height}
    Q ${x} ${y + height} ${x} ${y + height - r}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z
  `;
}

/**
 * Generate path for line with sharp triangle endpoints
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {string} startCap - Start cap style
 * @param {string} endCap - End cap style
 * @param {number} strokeWidth - Stroke width
 * @returns {string} SVG path string
 */
function generateLinePath(
  x1,
  y1,
  x2,
  y2,
  startCap = "flat",
  endCap = "flat",
  strokeWidth = 1
) {
  const triangleData = calculateTriangleCapPoints(
    x1,
    y1,
    x2,
    y2,
    startCap,
    endCap,
    strokeWidth
  );

  if (!triangleData.hasTriangleStart && !triangleData.hasTriangleEnd) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const {
    startX,
    startY,
    endX,
    endY,
    perpX,
    perpY,
    halfStroke,
    hasTriangleStart,
    hasTriangleEnd,
    originalX1,
    originalY1,
    originalX2,
    originalY2,
  } = triangleData;

  if (hasTriangleStart && hasTriangleEnd) {
    return `
      M ${startX} ${startY}
      L ${originalX1 + perpX * halfStroke} ${originalY1 + perpY * halfStroke}
      L ${originalX2 + perpX * halfStroke} ${originalY2 + perpY * halfStroke}
      L ${endX} ${endY}
      L ${originalX2 - perpX * halfStroke} ${originalY2 - perpY * halfStroke}
      L ${originalX1 - perpX * halfStroke} ${originalY1 - perpY * halfStroke}
      Z
    `;
  } else if (hasTriangleStart) {
    return `
      M ${startX} ${startY}
      L ${originalX1 + perpX * halfStroke} ${originalY1 + perpY * halfStroke}
      L ${originalX2 + perpX * halfStroke} ${originalY2 + perpY * halfStroke}
      L ${originalX2 - perpX * halfStroke} ${originalY2 - perpY * halfStroke}
      L ${originalX1 - perpX * halfStroke} ${originalY1 - perpY * halfStroke}
      Z
    `;
  } else if (hasTriangleEnd) {
    return `
      M ${originalX1 + perpX * halfStroke} ${originalY1 + perpY * halfStroke}
      L ${originalX2 + perpX * halfStroke} ${originalY2 + perpY * halfStroke}
      L ${endX} ${endY}
      L ${originalX2 - perpX * halfStroke} ${originalY2 - perpY * halfStroke}
      L ${originalX1 - perpX * halfStroke} ${originalY1 - perpY * halfStroke}
      Z
    `;
  }

  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Render a single shape element using SVG
 * @param {object} shape - Shape configuration object
 * @param {number} containerX - Container X offset
 * @param {number} containerY - Container Y offset
 * @param {number} index - Shape index for z-index layering
 * @returns {string} SVG string for the shape
 */
function renderSingleShapeSvg(shape, containerX, containerY, index = 0) {
  const x = safeInt(shape.x, 0) - containerX;
  const y = safeInt(shape.y, 0) - containerY;
  const width = safeInt(shape.w, 0);
  const height = safeInt(shape.h, 0);
  const fillColor = shape.fillcolor || "#FFFFFF";
  const radius = safeInt(shape.radius, 0);
  const startCap = shape.strokestartcap || "flat";
  const endCap = shape.strokeendcap || "flat";

  const strokeAttrs = buildStrokeAttributes(shape);
  const strokeAttributeString = generateStrokeAttributeString(strokeAttrs);

  // Determine if this is a line or rectangle
  const isLine =
    shape.type === "line" ||
    width <= strokeAttrs.strokeWidth ||
    height <= strokeAttrs.strokeWidth;

  let pathData;
  let fillAttribute = `fill="${fillColor}"`;
  let finalStrokeWidth = strokeAttrs.strokeWidth;

  if (isLine) {
    // Render as line with potential triangle endpoints
    const x2 = x + width;
    const y2 = y + height;
    pathData = generateLinePath(
      x,
      y,
      x2,
      y2,
      startCap,
      endCap,
      strokeAttrs.strokeWidth
    );

    // For triangle caps on lines, we fill the path instead of stroking
    if (startCap === "triangle" || endCap === "triangle") {
      fillAttribute = `fill="${strokeAttrs.stroke}"`;
      finalStrokeWidth = 0; // Don't stroke when we're filling triangle shapes
    }
  } else {
    pathData = generateRectPath(
      x,
      y,
      width,
      height,
      radius,
      startCap,
      endCap,
      strokeAttrs.strokeWidth
    );
  }

  const transformString = buildTransformString(shape.transforms, width, height);
  const transformAttr = transformString ? `transform="${transformString}"` : "";

  const finalStrokeAttributeString =
    finalStrokeWidth !== strokeAttrs.strokeWidth
      ? strokeAttributeString.replace(
          `stroke-width="${strokeAttrs.strokeWidth}"`,
          `stroke-width="${finalStrokeWidth}"`
        )
      : strokeAttributeString;

  return `
    <path d="${pathData}"
          ${fillAttribute}
          ${finalStrokeAttributeString}
          ${transformAttr}
          style="z-index: ${index};" />
  `;
}

/**
 * Render a single shape element using HTML/CSS
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

  const transformString = buildTransformString(shape.transforms, width, height);
  const transformStyle = transformString
    ? `transform: ${transformString}; transform-origin: center;`
    : "";

  const borderStyle = getCssBorderStyle(shape.strokedashes);

  // Note: CSS cannot create true triangle caps, so this fallback uses standard borders
  return `
    <div class="shape-layer" style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      box-sizing: border-box;
      background-color: ${fillColor};
      border: ${strokeWidth}px ${borderStyle} ${strokeColor};
      ${radius > 0 ? `border-radius: ${radius}px;` : ""}
      ${transformStyle}
      z-index: ${index};
    ">
    </div>`;
}

/**
 * Check if a shape requires SVG rendering (has advanced stroke features)
 * @param {object} shape - Shape object
 * @returns {boolean} True if SVG rendering is required
 */
function requiresSvgRendering(shape) {
  return requiresSvgForStroke(shape);
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

  if (cfg.shapes && Array.isArray(cfg.shapes) && cfg.shapes.length > 0) {
    const needsSvg =
      cfg.requiresSvg ||
      cfg.shapes.some((shape) => requiresSvgRendering(shape));

    if (needsSvg) {
      const shapesHtml = cfg.shapes
        .map((shape, index) =>
          renderSingleShapeSvg(shape, containerX, containerY, index)
        )
        .join("");

      return `
      <div class="widget no-drag"${attrStr} style="
        position: absolute;
        left: ${containerX}px;
        top: ${containerY}px;
        width: ${containerWidth}px;
        height: ${containerHeight}px;
        box-sizing: border-box;
      ">
        <svg width="${containerWidth}" height="${containerHeight}" 
             style="position: absolute; top: 0; left: 0;">
          ${shapesHtml}
        </svg>
      </div>`;
    } else {
      const shapesHtml = cfg.shapes
        .map((shape, index) =>
          renderSingleShape(shape, containerX, containerY, index)
        )
        .join("");

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
    }
  } else {
    const x = containerX;
    const y = containerY;
    const width = containerWidth;
    const height = containerHeight;
    const fillColor = cfg.fillcolor || "#FFFFFF";
    const strokeColor = cfg.strokecolor || "#000000";
    const strokeWidth = safeInt(cfg.strokewidth, 1);
    const radius = safeInt(cfg.radius, 0);

    const transforms = cfg.transforms || {
      rotate: { angle: 0, anchorX: null, anchorY: null },
      scale: { x: 1.0, y: 1.0, anchorX: null, anchorY: null },
      skew: { x: 0.0, y: 0.0, anchorX: null, anchorY: null },
      offset: { x: 0, y: 0 },
      transformOrder: ["rotate", "scale", "skew", "offset"],
    };

    const singleShapeObj = {
      strokestartcap: cfg.strokestartcap || "flat",
      strokeendcap: cfg.strokeendcap || "flat",
      strokedashcap: cfg.strokedashcap || "flat",
      strokedashes: cfg.strokedashes || null,
      strokelinejoin: cfg.strokelinejoin || "miter",
      strokemiterlimit: cfg.strokemiterlimit || 10.0,
      strokedashoffset: cfg.strokedashoffset || 0,
      x: 0,
      y: 0,
      w: width,
      h: height,
      fillcolor: fillColor,
      strokecolor: strokeColor,
      strokewidth: strokeWidth,
      radius: radius,
      transforms: transforms,
    };

    if (requiresSvgRendering(singleShapeObj)) {
      const shapesSvg = renderSingleShapeSvg(singleShapeObj, 0, 0, 0);

      return `
      <div class="widget no-drag"${attrStr} style="
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${width}px;
        height: ${height}px;
        box-sizing: border-box;
      ">
        <svg width="${width}" height="${height}" 
             style="position: absolute; top: 0; left: 0;">
          ${shapesSvg}
        </svg>
      </div>`;
    } else {
      const transformString = buildTransformString(transforms, width, height);
      const transformStyle = transformString
        ? `transform: ${transformString}; transform-origin: center;`
        : "";

      const borderStyle = getCssBorderStyle(cfg.strokedashes);

      return `
      <div class="widget no-drag"${attrStr} style="
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${width}px;
        height: ${height}px;
        box-sizing: border-box;
        background-color: ${fillColor};
        border: ${strokeWidth}px ${borderStyle} ${strokeColor};
        ${radius > 0 ? `border-radius: ${radius}px;` : ""}
        ${transformStyle}
      ">
      </div>`;
    }
  }
}

module.exports = {
  renderShapeWidget,
  renderSingleShape,
  renderSingleShapeSvg,
  requiresSvgRendering,
};
