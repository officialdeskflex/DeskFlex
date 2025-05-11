// Utils.js
const path = require("path");
const { getWidgetsPath } = require("./ConfigFile");

function safeInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function stripQuotes(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/^['"](.+)['"]$/, '$1');
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function substituteVariables(str, vars) {
  if (typeof str !== 'string') return str;
  return str.replace(/#(\w+)#/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? vars[name]
      : ''
  );
}

function parseActionList(s) {
  if (typeof s !== 'string') return [];
  const actions = [];
  const bracketed = /\[!\s*(\w+)\s+((?:"[^"]*"|'[^']*'|[^\[\]]+?))\s*\]/g;
  let match;
  while ((match = bracketed.exec(s))) {
    let [, type, param] = match;
    param = stripQuotes(param.trim());
    actions.push({ type: type.toLowerCase(), param });
  }
  if (!actions.length) {
    const single = /^\s*!\s*(\w+)(?:\s+(['"])(.*?)\2|\s+(.+))\s*$/;
    const m2 = s.match(single);
    if (m2) {
      const type = m2[1].toLowerCase();
      const param = m2[3] != null ? m2[3] : (m2[4] || '').trim();
      actions.push({ type, param });
    }
  }
  if (!actions.length) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        arr.forEach(cmd => actions.push({ type: 'execute', param: cmd }));
      }
    } catch {}
  }
  return actions;
}

function buildActionAttributes(cfg) {
  let attrs = '';
  for (const [k, v] of Object.entries(cfg)) {
    if (/action$/i.test(k) && typeof v === 'string' && v.trim()) {
      const acts = parseActionList(v);
      if (acts.length) {
        attrs += ` data-${k.toLowerCase()}='${JSON.stringify(acts)}'`;
      }
    }
  }
  return attrs;
}

function resolveIniPath(filePath) {
  const baseDir = getWidgetsPath();
  let abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(baseDir, filePath);
  if (!path.extname(abs)) abs += ".ini";
  return path.normalize(path.resolve(abs));
}

function resolveKey(widgetWindowsMap, identifier) {
  const isBare =
    !identifier.includes(path.sep) && !path.extname(identifier);
  if (isBare) {
    const lower = identifier.toLowerCase();
    for (const key of widgetWindowsMap.keys()) {
      if (path.basename(key, ".ini").toLowerCase() === lower) {
        return key;
      }
    }
    return undefined;
  }
  return resolveIniPath(identifier);
}

module.exports = { safeInt, stripQuotes, escapeHtml, substituteVariables, parseActionList, buildActionAttributes, resolveIniPath, resolveKey };
