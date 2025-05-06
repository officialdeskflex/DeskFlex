const { safeInt, escapeHtml, buildActionAttributes } = require('../Utils');

function renderTextWidget(cfg) {
  // Normalize keys to lowercase for case-insensitive access
  const c = {};
  Object.keys(cfg).forEach(key => {
    c[key.toLowerCase()] = cfg[key];
  });

  // Position and size
  const x      = safeInt(c.x, 0);
  const y      = safeInt(c.y, 0);
  const width  = safeInt(c.w, 200);
  const height = safeInt(c.h, 50);

  // Text alignment mapping
  const justify = {
    'centercenter': 'center',
    'rightcenter':  'flex-end'
  }[c.stringalign] || 'flex-start';

  // Font properties
  const fontColor  = c.fontcolor   || '0,0,0';
  const fontFace   = c.fontface    || 'sans-serif';
  const fontWeight = c.fontweight  || 'normal';
  const fontSize   = safeInt(c.fontsize, 14);
  const smoothing  = c.antialias === '1' ? 'antialiased' : 'none';

  // Text content
  const text = escapeHtml(c.text || '');

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
