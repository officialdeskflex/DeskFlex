// Elements/Text.js
const { safeInt, escapeHtml, buildActionAttributes } = require('../Utils');

function renderTextWidget(cfg) {
  // Configuration is already normalized in ConfigParser.js
  
  // Position and size
  const x      = safeInt(cfg.x, 0);
  const y      = safeInt(cfg.y, 0);
  const width  = safeInt(cfg.w, 200);
  const height = safeInt(cfg.h, 50);

  // Text alignment mapping
  const justify = {
    'centercenter': 'center',
    'rightcenter':  'flex-end'
  }[cfg.stringalign] || 'flex-start';

  // Font properties
  const fontColor  = cfg.fontcolor   || '0,0,0';
  const fontFace   = cfg.fontface    || 'sans-serif';
  const fontWeight = cfg.fontweight  || 'normal';
  const fontSize   = safeInt(cfg.fontsize, 14);
  const smoothing  = cfg.antialias === '1' ? 'antialiased' : 'none';

  // Text content
  const text = escapeHtml(cfg.text || '');

  // Build interactive attributes (use original cfg for actions)
  const attrStr = buildActionAttributes(cfg);

  return `
    <div class="widget no-drag"${attrStr} style="
      position:absolute;
      left:${x}px;
      top:${y}px;
      width:${width}px;
      height:${height}px;
      display:flex;
      align-items:center;
      justify-content:${justify};
      color:rgb(${fontColor});
      font-family:'${fontFace}';
      font-weight:${fontWeight};
      font-size:${fontSize}px;
      -webkit-font-smoothing:${smoothing};
    ">
      ${text}
    </div>
  `;
}

module.exports = { renderTextWidget };