// ElementShapeParser.js
const { rgbToHex } = require("../Utils");
const { parseTransformParams, resolveExtendReferences, collectExtendReferences } = require("./ShapeUtils/ExtendResolver");

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
    // New stroke properties
    strokestartcap: "flat",
    strokeendcap: "flat",
    strokedashcap: "flat",
    strokedashes: null,
    strokelinejoin: "miter",
    strokemiterlimit: 10.0,
    strokedashoffset: 0,
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

    const m = token.match(/^(.+?)\s+([\d,.-]+|[a-zA-Z,.\s]+)$/);
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
    } else if (keyRaw === "strokestartcap") {
      shapeObj.strokestartcap = valueRaw.toLowerCase();
    } else if (keyRaw === "strokeendcap") {
      shapeObj.strokeendcap = valueRaw.toLowerCase();
    } else if (keyRaw === "strokedashcap") {
      shapeObj.strokedashcap = valueRaw.toLowerCase();
    } else if (keyRaw === "strokedashes") {
      // Parse dash pattern - can be comma-separated numbers
      const dashValues = valueRaw.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (dashValues.length > 0) {
        shapeObj.strokedashes = dashValues;
      }
    } else if (keyRaw === "strokelinejoin") {
      // Handle both "Miter" and "Miter, 10.0" formats
      const joinParts = valueRaw.split(",");
      shapeObj.strokelinejoin = joinParts[0].trim().toLowerCase();
      if (joinParts.length > 1) {
        const miterLimit = parseFloat(joinParts[1].trim());
        if (!isNaN(miterLimit)) {
          shapeObj.strokemiterlimit = miterLimit;
        }
      }
    } else if (keyRaw === "strokedashoffset") {
      const offset = parseFloat(valueRaw);
      if (!isNaN(offset)) {
        shapeObj.strokedashoffset = offset;
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
 * Check if a shape requires SVG rendering (has advanced stroke features)
 * @param {object} shape - Shape object
 * @returns {boolean} True if SVG rendering is required
 */
function requiresSvgRendering(shape) {
  return (
    shape.strokestartcap !== "flat" ||
    shape.strokeendcap !== "flat" ||
    shape.strokedashcap !== "flat" ||
    shape.strokedashes !== null ||
    shape.strokelinejoin !== "miter" ||
    shape.strokemiterlimit !== 10.0 ||
    shape.strokedashoffset !== 0
  );
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

      // Check if any shape requires SVG rendering
      cfg.requiresSvg = shapeDefinitions.some(shape => requiresSvgRendering(shape));

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

        // Copy new stroke properties
        cfg.strokestartcap = firstShape.strokestartcap;
        cfg.strokeendcap = firstShape.strokeendcap;
        cfg.strokedashcap = firstShape.strokedashcap;
        cfg.strokedashes = firstShape.strokedashes;
        cfg.strokelinejoin = firstShape.strokelinejoin;
        cfg.strokemiterlimit = firstShape.strokemiterlimit;
        cfg.strokedashoffset = firstShape.strokedashoffset;

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
  requiresSvgRendering,
};