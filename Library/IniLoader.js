// IniLoader.js
const fs   = require('fs');
const path = require('path');
const ini  = require('ini');

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
    const resolved   = path.isAbsolute(importPath)
      ? importPath
      : path.resolve(path.dirname(absPath), importPath);
    const childSecs  = parseIni(resolved, visited);
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

module.exports = { parseIni };
