const fs  = require('fs');
const ini = require('ini');

const DEFAULT = { Name: null, Author: null, Version: null, License: null, Information: null };
const keyMap  = Object.keys(DEFAULT).reduce((m,k)=>(m[k.toLowerCase()]=k,m), {});

/**
 * @param {string} file - path to the .ini file
 */
function getFlexInfo(file) {
  if (!fs.existsSync(file)) return { ...DEFAULT };
  let cfg;
  try {
    cfg = ini.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { ...DEFAULT };
  }
  const sec = Object.keys(cfg).find(s => s.toLowerCase() === 'flexinfo');
  if (!sec) return { ...DEFAULT };

  const res = { ...DEFAULT };
  Object.entries(cfg[sec]).forEach(([k, v]) => {
    const mapped = keyMap[k.toLowerCase()];
    if (mapped) res[mapped] = v;
  });
  return res;
}

/**
 * @param {string} file - path to the .ini file
 */
function hasFlexInfoSection(file) {
  if (!fs.existsSync(file)) return false;
  try {
    const cfg = ini.parse(fs.readFileSync(file, 'utf-8'));
    return Object.keys(cfg).some(s => s.toLowerCase() === 'flexinfo');
  } catch {
    return false;
  }
}

module.exports = { getFlexInfo, hasFlexInfoSection };