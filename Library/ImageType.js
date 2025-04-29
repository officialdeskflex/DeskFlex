// ImageType.js
const path = require('path');
const { safeInt, stripQuotes, buildActionAttributes } = require('./Utils');

function renderImageWidget(cfg, baseDir) {
  const x      = safeInt(cfg.X, 0);
  const y      = safeInt(cfg.Y, 0);
  const width  = safeInt(cfg.W, 100);
  const height = safeInt(cfg.H, 100);

  // Determine object-fit from PreserveAspectRatio (0=fill,1=contain,2=cover)
  const mode      = safeInt(cfg.PreserveAspectRatio, 0);
  const objectFit = { 0: 'fill', 1: 'contain', 2: 'cover' }[mode] || 'fill';
  const maskSize  = mode === 0 ? '100% 100%' : mode === 1 ? 'contain' : 'cover';

  // Grayscale filter
  const grayFilter = cfg.GrayScale == '1' ? 'grayscale(100%)' : '';

  // ImageAlpha as 0-255 → normalized opacity 0-1
  let alphaInt = parseInt(cfg.ImageAlpha, 10);
  if (isNaN(alphaInt)) alphaInt = 255;
  alphaInt = Math.min(255, Math.max(0, alphaInt));
  const alpha = (alphaInt / 255).toFixed(3);

  // ImageFlip: None, Horizontal, Vertical, Both
  const flipMode = (cfg.ImageFlip || 'None').toLowerCase();
  let flipTransform = '';
  switch (flipMode) {
    case 'horizontal': flipTransform = 'scaleX(-1)'; break;
    case 'vertical':   flipTransform = 'scaleY(-1)'; break;
    case 'both':       flipTransform = 'scaleX(-1) scaleY(-1)'; break;
  }

  // ImageRotate: degrees (can be negative)
  const rotateAngle     = parseFloat(cfg.ImageRotate) || 0;
  const rotateTransform = `rotate(${rotateAngle}deg)`;

  // Combine flip + rotate transforms
  const transform = [flipTransform, rotateTransform].filter(t => t).join(' ');
  const transformStyle = transform ? `transform: ${transform}; transform-origin: center center;` : '';

  // Prepare image source path & attributes
  let imgName = stripQuotes(cfg.ImageName || '');
  if (!path.isAbsolute(imgName)) imgName = path.join(baseDir, imgName);
  const srcPath = imgName.replace(/\\/g, '/');
  const attrStr = buildActionAttributes(cfg);

  // Determine if we're tinting
  const hasTint = !!cfg.ImageTint;
  let tintDiv = '';
  if (hasTint) {
    const parts = stripQuotes(cfg.ImageTint).split(',').map(n => parseInt(n, 10));
    const [r = 255, g = 255, b = 255, aTint = 255] = parts;
    const cr = Math.min(255, Math.max(0, r));
    const cg = Math.min(255, Math.max(0, g));
    const cb = Math.min(255, Math.max(0, b));
    const ca = Math.min(255, Math.max(0, aTint));
    const a  = (ca / 255).toFixed(3);

    tintDiv = `
      <div style="
        position:absolute;
        top:0; left:0;
        width:100%; height:100%;
        background-color: rgba(${cr},${cg},${cb},${a});
        /* mask with image alpha channel */
        mask-image: url('${srcPath}');
        mask-size: ${maskSize};
        mask-repeat: no-repeat;
        mask-position: center;
        mask-type: alpha;
        -webkit-mask-image: url('${srcPath}');
        -webkit-mask-size: ${maskSize};
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-position: center;
        opacity: ${alpha};
      ""></div>`;
  }

  return `
    <div class="widget no-drag"${attrStr} style="
      position:absolute;
      left:${x}px; top:${y}px;
      width:${width}px; height:${height}px;
      overflow:hidden;
      ${transformStyle}
    ">
      ${hasTint
        ? tintDiv
        : `<img src="${srcPath}" style="
             width:100%; height:100%;
             object-fit:${objectFit};
             filter:${grayFilter};
             opacity:${alpha};
           " />`}
    </div>`;
}

module.exports = { renderImageWidget };
