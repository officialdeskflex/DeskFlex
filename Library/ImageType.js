// ImageType.js
const path = require('path');
const { safeInt, stripQuotes, buildActionAttributes } = require('./Utils');

function renderImageWidget(cfg, baseDir) {
  const x      = safeInt(cfg.X, 0);
  const y      = safeInt(cfg.Y, 0);
  const width  = safeInt(cfg.W, 100);
  const height = safeInt(cfg.H, 100);

  // Determine object-fit from PreserveAspectRatio
  const mode      = safeInt(cfg.PreserveAspectRatio, 0);
  const objectFit = { 0: 'fill', 1: 'contain', 2: 'cover' }[mode] || 'fill';

  // Grayscale filter
  const grayFilter = cfg.GrayScale == '1' ? 'grayscale(100%)' : '';

  // ImageAlpha as 0-255 → normalized opacity 0-1
  let alphaInt = parseInt(cfg.ImageAlpha, 10);
  if (isNaN(alphaInt)) alphaInt = 255;
  alphaInt = Math.min(255, Math.max(0, alphaInt));
  const alpha = (alphaInt / 255).toFixed(3);

  // Prepare image source path and attributes before tint logic
  let imgName = stripQuotes(cfg.ImageName || '');
  if (!path.isAbsolute(imgName)) imgName = path.join(baseDir, imgName);
  const srcPath = imgName.replace(/\\/g, '/');
  const attrStr = buildActionAttributes(cfg);

  // Tint overlay if ImageTint is specified, clipped to image alpha
  let tintDiv = '';
  if (cfg.ImageTint) {
    const parts = stripQuotes(cfg.ImageTint)
      .split(',')
      .map(n => parseInt(n, 10));
    const [r = 255, g = 255, b = 255, aInt = 255] = parts;
    const cr = Math.min(255, Math.max(0, r));
    const cg = Math.min(255, Math.max(0, g));
    const cb = Math.min(255, Math.max(0, b));
    const ca = Math.min(255, Math.max(0, aInt));
    const a = (ca / 255).toFixed(3);

    tintDiv = `
      <div style="
        position:absolute; top:0; left:0;
        width:100%; height:100%;
        background-color: rgba(${cr},${cg},${cb},${a});
        mask: url('${srcPath}') no-repeat center / ${objectFit};
        -webkit-mask: url('${srcPath}') no-repeat center / ${objectFit};
        pointer-events: none;
      "></div>`;
  }

  return `
    <div class="widget no-drag"${attrStr} style="
      position:absolute;
      left:${x}px; top:${y}px;
      width:${width}px; height:${height}px;
      overflow:hidden;
    ">
      <img src="${srcPath}"
           style="
             width:100%; height:100%;
             object-fit:${objectFit};
             filter:${grayFilter};
             opacity:${alpha};
           " />
      ${tintDiv}
    </div>`;
}

module.exports = { renderImageWidget };
