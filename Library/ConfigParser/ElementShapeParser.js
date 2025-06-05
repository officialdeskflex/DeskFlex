// ElementShapeParser.js
const { rgbToHex } = require("../Utils");

/**
 * Parse transform parameters from a string
 * @param {string} valueRaw - Parameter string (e.g., "45,10,20" or "1.5,2.0")
 * @returns {Array} Array of parsed numbers
 */
function parseTransformParams(valueRaw) {
  return valueRaw.split(",").map((n) => parseFloat(n.trim())).filter(n => !isNaN(n));
}

/**
 * Parse a single shape definition string
 * @param {string} shapeDef - Shape definition string
 * @returns {object|null} Parsed shape object or null if invalid
 */
function parseShapeDefinition(shapeDef) {
  if (!shapeDef || typeof shapeDef !== "string") {
    return null;
  }

  const shapeParts = shapeDef.split("|").map((p) => p.trim());
  const mainPart = shapeParts[0]; // e.g. "Rectangle 4,4,110,110,55"

  const [shapeTypeRaw, coordStr] = mainPart.split(/\s+(.+)/);
  const shapeType = (shapeTypeRaw || "").toLowerCase();
  if (shapeType !== "rectangle" || !coordStr) {
    console.warn(`Unsupported Shape type or malformed params: "${shapeDef}"`);
    return null;
  }

  const coords = coordStr.split(",").map((n) => parseInt(n, 10).valueOf());
  const [sx = 0, sy = 0, sw = 0, sh = 0, sr = 0] = coords;

  const shapeObj = {
    x: sx,
    y: sy,
    w: sw,
    h: sh,
    radius: sr,
    fillcolor: "#FFFFFF",
    strokecolor: "#000000",
    strokewidth: 1,
    // Transform properties with defaults
    transforms: {
      rotate: { angle: 0, anchorX: null, anchorY: null },
      scale: { x: 1.0, y: 1.0, anchorX: null, anchorY: null },
      skew: { x: 0.0, y: 0.0, anchorX: null, anchorY: null },
      offset: { x: 0, y: 0 },
      transformOrder: ['rotate', 'scale', 'skew', 'offset']
    }
  };

  // Process shape styling and transforms
  for (let i = 1; i < shapeParts.length; i++) {
    const token = shapeParts[i];

    const m = token.match(/^(.+?)\s+([\d,.-]+)$/);
    if (!m) {
      console.warn(`Malformed Shape style token: "${token}"`);
      continue;
    }
    const keyRaw = m[1].trim().toLowerCase();
    const valueRaw = m[2].trim();

    if (
      keyRaw === "fill" ||
      keyRaw === "fillcolor" ||
      keyRaw === "fill color"
    ) {
      const hex = rgbToHex(valueRaw);
      if (hex) {
        shapeObj.fillcolor = hex;
      }
    } else if (
      keyRaw === "stroke" ||
      keyRaw === "strokecolor" ||
      keyRaw === "stroke color"
    ) {
      const hex = rgbToHex(valueRaw);
      if (hex) {
        shapeObj.strokecolor = hex;
      }
    } else if (keyRaw === "strokewidth") {
      const swv = parseInt(valueRaw, 10);
      if (!isNaN(swv)) {
        shapeObj.strokewidth = swv;
      }
    } else if (keyRaw === "rotate") {
      const params = parseTransformParams(valueRaw);
      if (params.length >= 1) {
        shapeObj.transforms.rotate.angle = params[0];
        if (params.length >= 3) {
          shapeObj.transforms.rotate.anchorX = params[1];
          shapeObj.transforms.rotate.anchorY = params[2];
        }
      }
    } else if (keyRaw === "scale") {
      const params = parseTransformParams(valueRaw);
      if (params.length >= 1) {
        shapeObj.transforms.scale.x = params[0];
        shapeObj.transforms.scale.y = params.length >= 2 ? params[1] : params[0];
        if (params.length >= 4) {
          shapeObj.transforms.scale.anchorX = params[2];
          shapeObj.transforms.scale.anchorY = params[3];
        }
      }
    } else if (keyRaw === "skew") {
      const params = parseTransformParams(valueRaw);
      if (params.length >= 1) {
        shapeObj.transforms.skew.x = params[0];
        if (params.length >= 2) {
          shapeObj.transforms.skew.y = params[1];
        }
        if (params.length >= 4) {
          shapeObj.transforms.skew.anchorX = params[2];
          shapeObj.transforms.skew.anchorY = params[3];
        }
      }
    } else if (keyRaw === "offset") {
      const params = parseTransformParams(valueRaw);
      if (params.length >= 2) {
        shapeObj.transforms.offset.x = params[0];
        shapeObj.transforms.offset.y = params[1];
      }
    } else if (keyRaw === "transformorder") {
      // Parse transform order - expect comma-separated transform names
      const orderStr = valueRaw.toLowerCase().replace(/[\d\s]/g, ''); // Remove numbers and spaces
      const specified = orderStr.split(',').map(s => s.trim()).filter(s => s);
      const valid = ['rotate', 'scale', 'skew', 'offset'];
      const validSpecified = specified.filter(s => valid.includes(s));
      const remaining = valid.filter(s => !validSpecified.includes(s));
      shapeObj.transforms.transformOrder = [...validSpecified, ...remaining];
    } else {
      console.warn(`Unknown Shape style token: "${token}"`);
    }
  }

  return shapeObj;
}

/**
 * Process shape elements in configuration (now supports multiple shapes)
 * @param {object} widgetConfig - Widget configuration object
 * @returns {object} Configuration with processed shapes
 */
function processShapes(widgetConfig) {
  const processedConfig = { ...widgetConfig };

  for (const cfg of Object.values(processedConfig)) {
    const elementType = (cfg.element || "").trim().toLowerCase();
    if (elementType === "shape") {
      // Collect all shape definitions (Shape, Shape2, Shape3, etc.)
      const shapeDefinitions = [];
      const shapeKeys = Object.keys(cfg).filter((key) =>
        key.toLowerCase().match(/^shape\d*$/)
      );

      // Sort shape keys to maintain order (Shape, Shape2, Shape3, etc.)
      shapeKeys.sort((a, b) => {
        const aNum = a.toLowerCase().replace("shape", "") || "0";
        const bNum = b.toLowerCase().replace("shape", "") || "0";
        return parseInt(aNum, 10) - parseInt(bNum, 10);
      });

      for (const shapeKey of shapeKeys) {
        const shapeDef = cfg[shapeKey];
        const parsedShape = parseShapeDefinition(shapeDef);
        if (parsedShape) {
          shapeDefinitions.push(parsedShape);
        }
      }

      if (shapeDefinitions.length === 0) {
        console.warn(`No valid Shape definitions found for Shape element.`);
        continue;
      }

      // Store the parsed shapes array
      cfg.shapes = shapeDefinitions;

      // For backward compatibility, set properties from the first shape
      const firstShape = shapeDefinitions[0];
      if (firstShape) {
        // Set normalized properties
        cfg.x = firstShape.x;
        cfg.y = firstShape.y;
        cfg.w = firstShape.w;
        cfg.h = firstShape.h;
        cfg.radius = firstShape.radius;
        cfg.fillcolor = firstShape.fillcolor;
        cfg.strokecolor = firstShape.strokecolor;
        cfg.strokewidth = firstShape.strokewidth;

        // Also set uppercase for backward compatibility
        cfg.X = firstShape.x;
        cfg.Y = firstShape.y;
        cfg.W = firstShape.w;
        cfg.H = firstShape.h;
        cfg.Radius = firstShape.radius;
        cfg.FillColor = firstShape.fillcolor;
        cfg.StrokeColor = firstShape.strokecolor;
        cfg.StrokeWidth = firstShape.strokewidth;
      }

      // Calculate overall bounding box for multiple shapes
      if (shapeDefinitions.length > 1) {
        let minX = Infinity,
          minY = Infinity;
        let maxX = -Infinity,
          maxY = -Infinity;

        for (const shape of shapeDefinitions) {
          minX = Math.min(minX, shape.x);
          minY = Math.min(minY, shape.y);
          maxX = Math.max(maxX, shape.x + shape.w);
          maxY = Math.max(maxY, shape.y + shape.h);
        }

        // Update overall dimensions
        cfg.x = minX;
        cfg.y = minY;
        cfg.w = maxX - minX;
        cfg.h = maxY - minY;
        cfg.X = minX;
        cfg.Y = minY;
        cfg.W = maxX - minX;
        cfg.H = maxY - minY;
      }
    }
  }

  return processedConfig;
}

module.exports = {
  parseShapeDefinition,
  processShapes,
};