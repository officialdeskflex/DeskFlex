// TypeSections/ShapeType.js
const { safeInt } = require("../Utils");

function renderShapeWidget(cfg) {
  const c = {};
  Object.keys(cfg).forEach((key) => {
    c[key.toLowerCase()] = cfg[key];
  });

  const x = safeInt(c.x, 0);
  const y = safeInt(c.y, 0);
  const width = safeInt(c.w ?? c.width, 0);
  const height = safeInt(c.h ?? c.height, 0);
  const fillColor = c.fillcolor || "#FFFFFF";
  const strokeColor = c.strokecolor || "#000000";
  const strokeWidth = safeInt(c.strokewidth, 1);
  const radius = safeInt(c.radius, 0);

  return `
    <div class="widget no-drag" style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      box-sizing: border-box;
      background-color: ${fillColor};
      border: ${strokeWidth}px solid ${strokeColor};
      ${radius > 0 ? `border-radius: ${radius}px;` : ""}
    ">
    </div>`;
}

module.exports = { renderShapeWidget };
