// ImageType.js
const path = require('path');
const { safeInt, stripQuotes, buildActionAttributes } = require('./Utils');

function renderImageWidget(cfg, baseDir) {
  const x      = safeInt(cfg.X, 0);
  const y      = safeInt(cfg.Y, 0);
  const width  = safeInt(cfg.W   ?? cfg.Width, 100);
  const height = safeInt(cfg.H   ?? cfg.Height,100);

  let imgName = stripQuotes(cfg.ImageName || '');
  if (!path.isAbsolute(imgName)) {
    imgName = path.join(baseDir, imgName);
  }
  const srcPath = imgName.replace(/\\/g, '/');
  const attrStr = buildActionAttributes(cfg);

  return `
    <div class="widget no-drag"${attrStr} style="
      position:absolute;
      left:${x}px;
      top:${y}px;
      width:${width}px;
      height:${height}px;
    ">
      <img src="${srcPath}"
           style="width:100%; height:100%; object-fit:contain;" />
    </div>
  `;
}

module.exports = { renderImageWidget };
