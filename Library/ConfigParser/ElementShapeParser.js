// ElementShapeParser.js
const { rgbToHex } = require("../Utils");

/**
 * Parse transform parameters from a string
 * @param {string} valueRaw - Parameter string (e.g., "45,10,20" or "1.5,2.0")
 * @returns {Array} Array of parsed numbers
 */
function parseTransformParams(valueRaw) {
  return valueRaw
    .split(",")
    .map((n) => parseFloat(n.trim()))
    .filter((n) => !isNaN(n));
}

/**
 * Parse and resolve Extend references in a shape definition
 * @param {string} shapeDef - Shape definition string
 * @param {object} cfg - Configuration object containing potential extend definitions
 * @returns {string} Shape definition with extend references resolved
 */
function resolveExtendReferences(shapeDef, cfg) {
  if (!shapeDef || typeof shapeDef !== "string") {
    return shapeDef;
  }

  const shapeParts = shapeDef.split("|").map((p) => p.trim());
  const resolvedParts = [];

  for (const part of shapeParts) {
    const extendMatch = part.match(/^Extend\s+(.+)$/i);
    if (extendMatch) {
      const extendRefs = extendMatch[1].split(",").map((ref) => ref.trim());

      for (const extendRef of extendRefs) {
        // Try case-insensitive lookup
        let extendDef = cfg[extendRef];

        if (!extendDef) {
          const lowerRef = extendRef.toLowerCase();
          extendDef = cfg[lowerRef];
        }

        if (!extendDef) {
          const matchingKey = Object.keys(cfg).find(
            (key) => key.toLowerCase() === extendRef.toLowerCase()
          );
          if (matchingKey) {
            extendDef = cfg[matchingKey];
          }
        }

        if (extendDef && typeof extendDef === "string") {
          // Split the extend definition and add each part
          const extendParts = extendDef
            .split("|")
            .map((p) => p.trim())
            .filter((p) => p);
          resolvedParts.push(...extendParts);
          console.log(
            `Resolved Extend "${extendRef}" to: ${extendParts.join(" | ")}`
          );
        } else {
          console.warn(
            `Extend reference "${extendRef}" not found or invalid. Available keys:`,
            Object.keys(cfg)
          );
        }
      }
    } else {
      resolvedParts.push(part);
    }
  }

  const result = resolvedParts.join(" | ");
  console.log(`Final resolved shape definition: ${result}`);
  return result;
}

/**
 * Parse a single shape definition string
 * @param {string} shapeDef - Shape definition string
 * @param {object} cfg - Configuration object for resolving extends
 * @returns {object|null} Parsed shape object or null if invalid
 */
function parseShapeDefinition(shapeDef, cfg = {}) {
  if (!shapeDef || typeof shapeDef !== "string") {
    return null;
  }

  const resolvedShapeDef = resolveExtendReferences(shapeDef, cfg);

  const shapeParts = resolvedShapeDef.split("|").map((p) => p.trim());
  const mainPart = shapeParts[0];

  const [shapeTypeRaw, coordStr] = mainPart.split(/\s+(.+)/);
  const shapeType = (shapeTypeRaw || "").toLowerCase();
  if (shapeType !== "rectangle" || !coordStr) {
    console.warn(
      `Unsupported Shape type or malformed params: "${resolvedShapeDef}"`
    );
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
    transforms: {
      rotate: { angle: 0, anchorX: null, anchorY: null },
      scale: { x: 1.0, y: 1.0, anchorX: null, anchorY: null },
      skew: { x: 0.0, y: 0.0, anchorX: null, anchorY: null },
      offset: { x: 0, y: 0 },
      transformOrder: ["rotate", "scale", "skew", "offset"],
    },
  };

  for (let i = 1; i < shapeParts.length; i++) {
    const token = shapeParts[i];
    console.log(`Processing shape token: "${token}"`);

    const m = token.match(/^(.+?)\s+([\d,.-]+)$/);
    if (!m) {
      console.warn(`Malformed Shape style token: "${token}"`);
      continue;
    }
    const keyRaw = m[1].trim().toLowerCase();
    const valueRaw = m[2].trim();
    console.log(`Parsed token - Key: "${keyRaw}", Value: "${valueRaw}"`);

    if (
      keyRaw === "fill" ||
      keyRaw === "fillcolor" ||
      keyRaw === "fill color"
    ) {
      const hex = rgbToHex(valueRaw);
      if (hex) {
        shapeObj.fillcolor = hex;
        console.log(`Applied fill color: ${valueRaw} -> ${hex}`);
      } else {
        console.warn(`Failed to parse fill color: ${valueRaw}`);
      }
    } else if (
      keyRaw === "stroke" ||
      keyRaw === "strokecolor" ||
      keyRaw === "stroke color"
    ) {
      const hex = rgbToHex(valueRaw);
      if (hex) {
        shapeObj.strokecolor = hex;
        console.log(`Applied stroke color: ${valueRaw} -> ${hex}`);
      } else {
        console.warn(`Failed to parse stroke color: ${valueRaw}`);
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
        shapeObj.transforms.scale.y =
          params.length >= 2 ? params[1] : params[0];
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
      const orderStr = valueRaw.toLowerCase().replace(/[\d\s]/g, "");
      const specified = orderStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      const valid = ["rotate", "scale", "skew", "offset"];
      const validSpecified = specified.filter((s) => valid.includes(s));
      const remaining = valid.filter((s) => !validSpecified.includes(s));
      shapeObj.transforms.transformOrder = [...validSpecified, ...remaining];
    } else {
      console.warn(`Unknown Shape style token: "${token}"`);
    }
  }

  return shapeObj;
}

/**
 * Identify and collect extend reference names from configuration
 * @param {object} cfg - Configuration object
 * @returns {Set} Set of extend reference names (actual keys from config)
 */
function collectExtendReferences(cfg) {
  const extendRefs = new Set();

  const shapeKeys = Object.keys(cfg).filter((key) =>
    key.toLowerCase().match(/^shape\d*$/)
  );

  for (const shapeKey of shapeKeys) {
    const shapeDef = cfg[shapeKey];
    if (typeof shapeDef === "string") {
      const shapeParts = shapeDef.split("|").map((p) => p.trim());

      for (const part of shapeParts) {
        const extendMatch = part.match(/^Extend\s+(.+)$/i);
        if (extendMatch) {
          const refs = extendMatch[1].split(",").map((ref) => ref.trim());
          for (const ref of refs) {
            const actualKey = Object.keys(cfg).find(
              (key) => key.toLowerCase() === ref.toLowerCase()
            );
            if (actualKey) {
              extendRefs.add(actualKey);
            }
          }
        }
      }
    }
  }

  return extendRefs;
}

/**
 * Process shape elements in configuration (now supports multiple shapes and Extend)
 * @param {object} widgetConfig - Widget configuration object
 * @returns {object} Configuration with processed shapes
 */
function processShapes(widgetConfig) {
  const processedConfig = { ...widgetConfig };

  for (const cfg of Object.values(processedConfig)) {
    const elementType = (cfg.element || "").trim().toLowerCase();
    if (elementType === "shape") {
      const extendRefs = collectExtendReferences(cfg);

      const shapeDefinitions = [];
      const shapeKeys = Object.keys(cfg).filter((key) =>
        key.toLowerCase().match(/^shape\d*$/)
      );

      shapeKeys.sort((a, b) => {
        const aNum = a.toLowerCase().replace("shape", "") || "0";
        const bNum = b.toLowerCase().replace("shape", "") || "0";
        return parseInt(aNum, 10) - parseInt(bNum, 10);
      });

      for (const shapeKey of shapeKeys) {
        const shapeDef = cfg[shapeKey];
        const parsedShape = parseShapeDefinition(shapeDef, cfg);
        if (parsedShape) {
          shapeDefinitions.push(parsedShape);
        }
      }

      if (shapeDefinitions.length === 0) {
        console.warn(`No valid Shape definitions found for Shape element.`);
        continue;
      }

      cfg.shapes = shapeDefinitions;

      const firstShape = shapeDefinitions[0];
      if (firstShape) {
        cfg.x = firstShape.x;
        cfg.y = firstShape.y;
        cfg.w = firstShape.w;
        cfg.h = firstShape.h;
        cfg.radius = firstShape.radius;
        cfg.fillcolor = firstShape.fillcolor;
        cfg.strokecolor = firstShape.strokecolor;
        cfg.strokewidth = firstShape.strokewidth;

        cfg.X = firstShape.x;
        cfg.Y = firstShape.y;
        cfg.W = firstShape.w;
        cfg.H = firstShape.h;
        cfg.Radius = firstShape.radius;
        cfg.FillColor = firstShape.fillcolor;
        cfg.StrokeColor = firstShape.strokecolor;
        cfg.StrokeWidth = firstShape.strokewidth;
      }

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

        cfg.x = minX;
        cfg.y = minY;
        cfg.w = maxX - minX;
        cfg.h = maxY - minY;
        cfg.X = minX;
        cfg.Y = minY;
        cfg.W = maxX - minX;
        cfg.H = maxY - minY;
      }

      extendRefs.forEach((ref) => {
        if (cfg.hasOwnProperty(ref)) {
          delete cfg[ref];
        }
      });
    }
  }

  return processedConfig;
}

module.exports = {
  parseShapeDefinition,
  processShapes,
  resolveExtendReferences,
  collectExtendReferences,
};
