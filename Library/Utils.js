// Utils.js
/**
 * Safely parse an integer, with a fallback.
 */
function safeInt(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  
  /**
   * Strip matching single or double quotes from start/end of a string.
   */
  function stripQuotes(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/^['"](.+)['"]$/, '$1');
  }
  
  /**
   * Escape HTML-special characters in text.
   */
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
  
  /**
   * Substitute #VAR# in a string, using the provided vars object.
   * Unknown variables become the empty string.
   */
  function substituteVariables(str, vars) {
    if (typeof str !== 'string') return str;
    return str.replace(/#(\w+)#/g, (_, name) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : ''
    );
  }
  
  /**
   * Given a string like '["cmd1","cmd2"]', parse it to an array.
   */
  function parseActionList(s) {
    if (typeof s !== 'string') return [];
    try {
      return JSON.parse(s.trim());
    } catch {
      return [];
    }
  }
  
  /**
   * Build data- attributes for any cfg keys ending in "Action" whose value is a non-empty array.
   */
  function buildActionAttributes(cfg) {
    let attrs = '';
    Object.entries(cfg).forEach(([key, val]) => {
      if (key.endsWith('Action') && Array.isArray(val) && val.length) {
        attrs += ` data-${key.toLowerCase()}='${JSON.stringify(val)}'`;
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
    buildActionAttributes
  };
  