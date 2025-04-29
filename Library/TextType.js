// TextType.js
const { safeInt, escapeHtml, buildActionAttributes } = require('./Utils');

function renderTextWidget(cfg) {
  const x      = safeInt(cfg.X, 0);
  const y      = safeInt(cfg.Y, 0);
  const width  = safeInt(cfg.W, 200);
  const height = safeInt(cfg.H, 50);

  const justify = {
    CenterCenter: 'center',
    RightCenter:  'flex-end'
  }[cfg.StringAlign] || 'flex-start';

  const fontColor  = cfg.FontColor   || '0,0,0';
  const fontFace   = cfg.FontFace    || 'sans-serif';
  const fontWeight = cfg.FontWeight  || 'normal';
  const fontSize   = safeInt(cfg.FontSize, 14);
  const smoothing  = cfg.Antialias === '1' ? 'antialiased' : 'none';
  const text       = escapeHtml(cfg.Text || '');
  const attrStr    = buildActionAttributes(cfg);

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
