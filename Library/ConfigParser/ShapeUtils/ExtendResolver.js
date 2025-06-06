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

module.exports = {
  parseTransformParams,
  resolveExtendReferences,
  collectExtendReferences,
};
