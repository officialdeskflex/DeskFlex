// Utils.js
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
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : ''
  );
}

function parseActionList(s) {
  if (typeof s !== 'string') return [];
  const actions = [];
  const str = s.trim();
  const bracketed = /\[!\s*(\w+)\s+((?:"[^"]*"|'[^']*'|[^\[\]]+?))\s*\]/g;
  let match;
  while ((match = bracketed.exec(str))) {
    const rawType = match[1];
    let rawParam = match[2].trim();
    rawParam = stripQuotes(rawParam);
    actions.push({ type: rawType.toLowerCase(), param: rawParam });
  }

  if (!actions.length) {
    const single = /^\s*!\s*(\w+)(?:\s+(['"])(.*?)\2|\s+(.+))\s*$/;
    const m2 = str.match(single);
    if (m2) {
      const cmdType = m2[1].toLowerCase();
      const cmdParam = m2[3] != null ? m2[3] : (m2[4] || '').trim();
      actions.push({ type: cmdType, param: cmdParam });
    }
  }

  if (!actions.length) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        arr.forEach(cmd => actions.push({ type: 'execute', param: cmd }));
      }
    } catch {}
  }

  return actions;
}

function buildActionAttributes(cfg) {
  let attrs = '';
  Object.entries(cfg).forEach(([key, val]) => {
    if (/action$/i.test(key) && typeof val === 'string' && val.trim()) {
      const actions = parseActionList(val);
      if (actions.length) {
        attrs += ` data-${key.toLowerCase()}='${JSON.stringify(actions)}'`;
      }
    }
  });
  return attrs;
}

module.exports = {
  safeInt,
  stripQuotes,
  escapeHtml,
  substituteVariables,
  parseActionList,
  buildActionAttributes,
};
