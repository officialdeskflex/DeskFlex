// Elements/Shape.js
const { safeInt, buildActionAttributes } = require("../Utils");

/**
 * Build CSS transform string from shape transforms
 * @param {object} transforms - Transform configuration object
 * @param {number} width - Shape width for anchor calculations
 * @param {number} height - Shape height for anchor calculations
 * @returns {string} CSS transform string
 */
function buildTransformString(transforms, width, height) {
  if (!transforms) return '';

  const transformParts = [];
  const order = transforms.transformOrder || ['rotate', 'scale', 'skew', 'offset'];

  // Helper function to get anchor point or default to center
  const getAnchor = (anchorX, anchorY) => {
    const x = anchorX !== null ? anchorX : width / 2;
    const y = anchorY !== null ? anchorY : height / 2;
    return { x, y };
  };

  for (const transformType of order) {
    switch (transformType) {
      case 'rotate':
        if (transforms.rotate && transforms.rotate.angle !== 0) {
          const angle = transforms.rotate.angle;
          const anchor = getAnchor(transforms.rotate.anchorX, transforms.rotate.anchorY);
          
          if (transforms.rotate.anchorX !== null || transforms.rotate.anchorY !== null) {
            // Custom anchor point
            transformParts.push(`translate(${anchor.x}px, ${anchor.y}px)`);
            transformParts.push(`rotate(${angle}deg)`);
            transformParts.push(`translate(${-anchor.x}px, ${-anchor.y}px)`);
          } else {
            // Default center rotation
            transformParts.push(`rotate(${angle}deg)`);
          }
        }
        break;

      case 'scale':
        if (transforms.scale && (transforms.scale.x !== 1.0 || transforms.scale.y !== 1.0)) {
          const scaleX = transforms.scale.x;
          const scaleY = transforms.scale.y;
          const anchor = getAnchor(transforms.scale.anchorX, transforms.scale.anchorY);
          
          if (transforms.scale.anchorX !== null || transforms.scale.anchorY !== null) {
            // Custom anchor point
            transformParts.push(`translate(${anchor.x}px, ${anchor.y}px)`);
            transformParts.push(`scale(${scaleX}, ${scaleY})`);
            transformParts.push(`translate(${-anchor.x}px, ${-anchor.y}px)`);
          } else {
            // Default center scaling
            transformParts.push(`scale(${scaleX}, ${scaleY})`);
          }
        }
        break;

      case 'skew':
        if (transforms.skew && (transforms.skew.x !== 0.0 || transforms.skew.y !== 0.0)) {
          const skewX = transforms.skew.x;
          const skewY = transforms.skew.y;
          const anchor = getAnchor(transforms.skew.anchorX, transforms.skew.anchorY);
          
          if (transforms.skew.anchorX !== null || transforms.skew.anchorY !== null) {
            // Custom anchor point
            transformParts.push(`translate(${anchor.x}px, ${anchor.y}px)`);
            transformParts.push(`skew(${skewX}deg, ${skewY}deg)`);
            transformParts.push(`translate(${-anchor.x}px, ${-anchor.y}px)`);
          } else {
            // Default center skewing
            transformParts.push(`skew(${skewX}deg, ${skewY}deg)`);
          }
        }
        break;

      case 'offset':
        if (transforms.offset && (transforms.offset.x !== 0 || transforms.offset.y !== 0)) {
          transformParts.push(`translate(${transforms.offset.x}px, ${transforms.offset.y}px)`);
        }
        break;
    }
  }

  return transformParts.length > 0 ? transformParts.join(' ') : '';
}

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

  // Build transform string
  const transformString = buildTransformString(shape.transforms, width, height);
  const transformStyle = transformString ? `transform: ${transformString}; transform-origin: center;` : '';

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
      ${transformStyle}
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

    // For backward compatibility, check if transforms exist on the config object
    const transforms = cfg.transforms || {
      rotate: { angle: 0, anchorX: null, anchorY: null },
      scale: { x: 1.0, y: 1.0, anchorX: null, anchorY: null },
      skew: { x: 0.0, y: 0.0, anchorX: null, anchorY: null },
      offset: { x: 0, y: 0 },
      transformOrder: ['rotate', 'scale', 'skew', 'offset']
    };

    const transformString = buildTransformString(transforms, width, height);
    const transformStyle = transformString ? `transform: ${transformString}; transform-origin: center;` : '';

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
      ${transformStyle}
    ">
    </div>`;
  }
}

module.exports = { renderShapeWidget, renderSingleShape };