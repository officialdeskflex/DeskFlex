// Elements/Shape.js
const { safeInt } = require("../Utils");

function renderShapeWidget(cfg) {
  // Configuration is already normalized in ConfigParser.js
  const x = safeInt(cfg.x, 0);
  const y = safeInt(cfg.y, 0);
  const width = safeInt(cfg.w, 0);
  const height = safeInt(cfg.h, 0);
  const fillColor = cfg.fillcolor || "#FFFFFF";
  const strokeColor = cfg.strokecolor || "#000000";
  const strokeWidth = safeInt(cfg.strokewidth, 1);
  const radius = safeInt(cfg.radius, 0);

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
