// IniLoader.js
// ──────────────────
// Provides parseIniWithImports for merging @import’d INI/INC files.

const fs   = require('fs');
const path = require('path');
const ini  = require('ini');

/**
 * Recursively parse an INI file + any @import directives.
 * @param {string} filePath - absolute or relative path to .ini/.inc
 * @param {Set<string>} visited - tracks files to avoid cycles
 * @returns {Object} sections object as returned by ini.parse, merged
 */
function parseIniWithImports(filePath, visited = new Set()) {
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(path.dirname(module.parent.filename), filePath);

  if (visited.has(absPath)) {
    throw new Error(`Circular @import detected: ${absPath}`);
  }
  visited.add(absPath);

  let raw = fs.readFileSync(absPath, 'utf-8');

  // 1) Find @import lines
  const importRegex = /^\s*@import=(.+)$/gm;
  let match;
  const importedSections = {};

  while ((match = importRegex.exec(raw)) !== null) {
    const importPath = match[1].trim();
    const resolved   = path.isAbsolute(importPath)
      ? importPath
      : path.resolve(path.dirname(absPath), importPath);
    const childSecs  = parseIniWithImports(resolved, visited);
    // merge childSecs into importedSections
    Object.entries(childSecs).forEach(([secName, kv]) => {
      importedSections[secName] = {
        ...(importedSections[secName] || {}),
        ...kv
      };
    });
  }

  // 2) Remove all @import lines before parsing
  raw = raw.replace(importRegex, '');

  // 3) Parse this file’s own sections
  const ownSections = ini.parse(raw);

  // 4) Merge importedSections + ownSections (own overrides imported)
  const merged = { ...importedSections };
  Object.entries(ownSections).forEach(([secName, kv]) => {
    merged[secName] = {
      ...(merged[secName] || {}),
      ...kv
    };
  });

  return merged;
}

module.exports = { parseIniWithImports };
