//Elements/Image.js
const path = require('path');
const { safeInt, stripQuotes, buildActionAttributes } = require('../Utils');

function renderImageWidget(cfg, baseDir) {
  const x      = safeInt(cfg.x, 0);
  const y      = safeInt(cfg.y, 0);
  const width  = safeInt(cfg.w, 100);
  const height = safeInt(cfg.h, 100);

  const mode      = safeInt(cfg.preserveaspectratio, 0);
  const objectFit = { 0: 'fill', 1: 'contain', 2: 'cover' }[mode] || 'fill';
  const maskSize  = mode === 0 ? '100% 100%' : mode === 1 ? 'contain' : 'cover';

  const grayFilter = cfg.grayscale == '1' ? 'grayscale(100%)' : '';

  let alphaInt = parseInt(cfg.imagealpha, 10);
  if (isNaN(alphaInt)) alphaInt = 255;
  alphaInt = Math.min(255, Math.max(0, alphaInt));
  const alpha = (alphaInt / 255).toFixed(3);

  const flipMode = (cfg.imageflip || 'None').toLowerCase();
  let flipTransform = '';
  switch (flipMode) {
    case 'horizontal': flipTransform = 'scaleX(-1)'; break;
    case 'vertical':   flipTransform = 'scaleY(-1)'; break;
    case 'both':       flipTransform = 'scaleX(-1) scaleY(-1)'; break;
  }

  const rotateAngle     = parseFloat(cfg.imagerotate) || 0;
  const rotateTransform = `rotate(${rotateAngle}deg)`;

  const transform = [flipTransform, rotateTransform].filter(t => t).join(' ');
  const transformStyle = transform ? `transform: ${transform}; transform-origin: center center;` : '';

  let imgName = stripQuotes(cfg.imagename || '');
  if (!path.isAbsolute(imgName)) imgName = path.join(baseDir, imgName);
  const srcPath = imgName.replace(/\\/g, '/');
  const attrStr = buildActionAttributes(cfg);

  const tintVal = cfg.imagetint;
  const hasTint = typeof tintVal !== 'undefined' && tintVal !== null && tintVal !== '';
  let tintDiv = '';
  if (hasTint) {
    const parts = stripQuotes(tintVal).split(',').map(n => parseInt(n, 10));
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