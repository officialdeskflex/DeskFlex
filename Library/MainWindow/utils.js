// utils.js
// Utility functions for common operations

export function isWidgetActive(val) {
  return String(val) === "1";
}

export function isSupportedOption(val) {
  const s = String(val);
  return s === "0" || s === "1";
}

export function isOptionChecked(val) {
  return String(val) === "1";
}

export function buildPath(...segments) {
  return segments.join("\\").replace(/\\\\+/g, "\\");
}

export function getFullPath(item) {
  const segs = [];
  let node = item;
  while (node) {
    segs.unshift(node.querySelector("span:last-child").textContent);
    node = node
      .closest(".children")
      ?.parentElement.querySelector(":scope > .tree-node");
  }
  const base = (window.deskflex.widgetPath || "").replace(/[\/\\]+$/, "");
  return buildPath(base, ...segs);
}

export function createReverseMap(originalMap) {
  return Object.fromEntries(
    Object.entries(originalMap).map(([k, v]) => [v, parseInt(k, 10)])
  );
}