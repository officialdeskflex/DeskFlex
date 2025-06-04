// ConfigParser.js
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const getImageSize = require('./Helper/ImageSize');
const {
  substituteVariables,
  safeInt,
  rgbToHex,
} = require('./Utils');

function parseIni(filePath, visited = new Set()) {
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(path.dirname(module.parent.filename), filePath);

  if (visited.has(absPath)) {
    throw new Error(`Circular @import detected: ${absPath}`);
  }
  visited.add(absPath);

  let raw = fs.readFileSync(absPath, 'utf-8');

  raw = raw.replace(
    /^(\s*\w+Action\s*=\s*)(\[!.*)$/gm,
    '$1"$2\""'
  );

  const importRegex = /^\s*@import=(.+)$/gm;
  let match;
  const importedSections = {};

  while ((match = importRegex.exec(raw)) !== null) {
    const importPath = match[1].trim();
    const resolved = path.isAbsolute(importPath)
      ? importPath
      : path.resolve(path.dirname(absPath), importPath);
    const childSecs = parseIni(resolved, visited);
    Object.entries(childSecs).forEach(([secName, kv]) => {
      importedSections[secName] = {
        ...(importedSections[secName] || {}),
        ...kv
      };
    });
  }

  raw = raw.replace(importRegex, '');
  const ownSections = ini.parse(raw);
  const merged = { ...importedSections };
  Object.entries(ownSections).forEach(([secName, kv]) => {
    merged[secName] = {
      ...(merged[secName] || {}),
      ...kv
    };
  });

  return merged;
}

/**
 * Normalize all property names and values for consistent access
 * @param {object} widgetConfig - Raw widget configuration
 * @returns {object} Normalized configuration
 */
function normalizeConfiguration(widgetConfig) {
  const normalized = {};
  
  for (const [sectionName, section] of Object.entries(widgetConfig)) {
    normalized[sectionName] = {};
    
    for (const [key, value] of Object.entries(section)) {
      const normalizedKey = key.toLowerCase();
      
      // Handle special cases for common property names
      const keyMappings = {
        'x': 'x',
        'y': 'y', 
        'w': 'w',
        'width': 'w',
        'h': 'h',
        'height': 'h',
        'style': 'style',
        'element': 'element',
        'imagename': 'imagename',
        'text': 'text',
        'fontcolor': 'fontcolor',
        'fontface': 'fontface',
        'fontweight': 'fontweight',
        'fontsize': 'fontsize',
        'stringalign': 'stringalign',
        'antialias': 'antialias',
        'shape': 'shape',
        'fillcolor': 'fillcolor',
        'strokecolor': 'strokecolor',
        'strokewidth': 'strokewidth',
        'radius': 'radius',
        'preserveaspectratio': 'preserveaspectratio',
        'grayscale': 'grayscale',
        'imagealpha': 'imagealpha',
        'imageflip': 'imageflip',
        'imagerotate': 'imagerotate',
        'imagetint': 'imagetint'
      };
      
      // Use mapped key or original normalized key
      const finalKey = keyMappings[normalizedKey] || normalizedKey;
      
      // Store both original and normalized for backward compatibility
      normalized[sectionName][finalKey] = value;
      
      // Also store original case for actions and other special properties
      if (key.toLowerCase().includes('action')) {
        normalized[sectionName][key.toLowerCase()] = value;
      }
    }
  }
  
  return normalized;
}

/**
 * Parse a single shape definition string
 * @param {string} shapeDef - Shape definition string
 * @returns {object|null} Parsed shape object or null if invalid
 */
function parseShapeDefinition(shapeDef) {
  if (!shapeDef || typeof shapeDef !== 'string') {
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
    strokewidth: 1
  };

  // Process shape styling
  for (let i = 1; i < shapeParts.length; i++) {
    const token = shapeParts[i];

    const m = token.match(/^(.+?)\s+([\d,]+)$/);
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
    } else {
      console.warn(`Unknown Shape style token: "${token}"`);
    }
  }

  return shapeObj;
}

/**
 * Parse and process widget configuration file
 * @param {string} iniPath - Path to the INI file
 * @returns {object} Processed widget configuration
 */
function parseWidgetConfig(iniPath) {
  let widgetConfig;
  try {
    widgetConfig = parseIni(iniPath);
  } catch (err) {
    throw new Error(`Failed to parse ${path.basename(iniPath)}: ${err.message}`);
  }

  // Normalize all configuration keys and values
  widgetConfig = normalizeConfiguration(widgetConfig);

  // Additional legacy normalization for backward compatibility
  for (const cfg of Object.values(widgetConfig)) {
    // Handle uppercase variants that might still be needed
    ["x", "y", "w", "h", "style"].forEach((k) => {
      const low = k.toLowerCase(),
        up = k.toUpperCase();
      if (cfg[low] !== undefined && cfg[up] === undefined) {
        cfg[up] = cfg[low];
      }
    });
  }

  return widgetConfig;
}

/**
 * Apply styles to widget configuration
 * @param {object} widgetConfig - Widget configuration object
 * @returns {object} Configuration with styles applied
 */
function applyStyles(widgetConfig) {
  const processedConfig = { ...widgetConfig };
  const usedStyles = new Set();

  // Apply styles to configurations
  for (const cfg of Object.values(processedConfig)) {
    const styleRef = cfg.style || cfg.Style;
    if (styleRef) {
      usedStyles.add(styleRef);
      const base = processedConfig[styleRef];
      if (base) {
        // Apply style properties with case-insensitive matching
        ["x", "y", "w", "h", "width", "height"].forEach((k) => {
          const lowerK = k.toLowerCase();
          const upperK = k.toUpperCase();
          const baseValue = base[lowerK] || base[upperK] || base[k];
          const currentValue = cfg[lowerK] || cfg[upperK] || cfg[k];
          
          if (baseValue !== undefined && currentValue === undefined) {
            cfg[lowerK] = baseValue;
            if (upperK !== lowerK) cfg[upperK] = baseValue;
          }
        });
      } else {
        console.warn(`Style "${styleRef}" not found.`);
      }
    }
  }

  // Remove style definitions from final config
  usedStyles.forEach((s) => delete processedConfig[s]);
  
  return processedConfig;
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
      const shapeKeys = Object.keys(cfg).filter(key => 
        key.toLowerCase().match(/^shape\d*$/)
      );

      // Sort shape keys to maintain order (Shape, Shape2, Shape3, etc.)
      shapeKeys.sort((a, b) => {
        const aNum = a.toLowerCase().replace('shape', '') || '0';
        const bNum = b.toLowerCase().replace('shape', '') || '0';
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
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

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

/**
 * Process image elements in configuration
 * @param {object} widgetConfig - Widget configuration object
 * @param {string} baseDir - Base directory for resolving relative paths
 * @returns {object} Configuration with processed images
 */
function processImages(widgetConfig, baseDir) {
  const processedConfig = { ...widgetConfig };

  for (const cfg of Object.values(processedConfig)) {
    const elementType = (cfg.element || "").trim().toLowerCase();
    if (elementType === "image") {
      let img = (cfg.imagename || cfg.ImageName || "").replace(/"/g, "");
      if (!path.isAbsolute(img)) img = path.join(baseDir, img);
      
      const hasW = cfg.w || cfg.W || cfg.width || cfg.Width;
      const hasH = cfg.h || cfg.H || cfg.height || cfg.Height;
      
      if (!hasW || !hasH) {
        try {
          const sz = getImageSize(img);
          if (!hasW) {
            cfg.w = sz.width;
            cfg.W = sz.width;
          }
          if (!hasH) {
            cfg.h = sz.height;
            cfg.H = sz.height;
          }
        } catch (e) {
          console.warn(`Could not size ${img}:`, e);
        }
      }
    }
  }

  return processedConfig;
}

/**
 * Calculate window size based on widget elements
 * @param {object} widgetConfig - Widget configuration object
 * @returns {object} Window dimensions {width, height}
 */
function calculateWindowSize(widgetConfig) {
  let maxR = 0, maxB = 0;
  for (const cfg of Object.values(widgetConfig)) {
    const x = safeInt(cfg.x || cfg.X, 0);
    const y = safeInt(cfg.y || cfg.Y, 0);
    const w = safeInt(cfg.w || cfg.W || cfg.width || cfg.Width, 0);
    const h = safeInt(cfg.h || cfg.H || cfg.height || cfg.Height, 0);
    maxR = Math.max(maxR, x + w);
    maxB = Math.max(maxB, y + h);
  }
  return { width: maxR, height: maxB };
}

/**
 * Substitute variables in configuration
 * @param {object} widgetConfig - Widget configuration object
 * @param {object} variables - Variables to substitute
 * @returns {object} Configuration with substituted variables
 */
function substituteConfigVariables(widgetConfig, variables) {
  const processedConfig = {};
  
  for (const [sectionName, section] of Object.entries(widgetConfig)) {
    processedConfig[sectionName] = {};
    for (const [key, value] of Object.entries(section)) {
      processedConfig[sectionName][key] = typeof value === "string" 
        ? substituteVariables(value, variables) 
        : value;
    }
  }
  
  return processedConfig;
}

/**
 * Extract variables from configuration
 * @param {object} widgetConfig - Widget configuration object
 * @returns {object} {config: configWithoutVariables, variables: extractedVariables}
 */
function extractVariables(widgetConfig) {
  // Try both cases for Variables section
  const variables = widgetConfig.Variables || widgetConfig.variables || {};
  const configWithoutVariables = { ...widgetConfig };
  delete configWithoutVariables.Variables;
  delete configWithoutVariables.variables;
  
  return { config: configWithoutVariables, variables };
}

/**
 * Complete widget configuration processing pipeline
 * @param {string} iniPath - Path to the INI file
 * @returns {object} Fully processed widget configuration
 */
function processWidgetConfig(iniPath) {
  // Parse the initial configuration
  const rawConfig = parseWidgetConfig(iniPath);
  
  // Extract variables
  const { config: configWithoutVars, variables } = extractVariables(rawConfig);
  
  // Apply styles
  const styledConfig = applyStyles(configWithoutVars);
  
  // Process shapes
  const shapedConfig = processShapes(styledConfig);
  
  // Process images
  const baseDir = path.dirname(iniPath);
  const imageConfig = processImages(shapedConfig, baseDir);
  
  // Substitute variables
  const finalConfig = substituteConfigVariables(imageConfig, variables);
  
  // Calculate window size
  const windowSize = calculateWindowSize(finalConfig);
  
  return {
    config: finalConfig,
    variables,
    baseDir,
    windowSize
  };
}

module.exports = { 
  parseIni, 
  parseWidgetConfig,
  normalizeConfiguration,
  applyStyles,
  processShapes,
  processImages,
  calculateWindowSize,
  substituteConfigVariables,
  extractVariables,
  processWidgetConfig,
  parseShapeDefinition
};