// widgetManager.js
const { BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');
const ini = require('ini');

module.exports = { loadWidgetsFromIniFolder };

function loadWidgetsFromIniFolder(folder) {
    console.log('▶️ Loading widget configs from:', folder);
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.ini'));
    console.log(`▶️ Found INI files:`, files);

    files.forEach(file => {
        const fullPath = path.join(folder, file);
        const contents = fs.readFileSync(fullPath, 'utf-8');
        const sections = ini.parse(contents);

        // create one window for this file
        createWidgetsWindow(path.basename(file, '.ini'), sections);
    });
}

function createWidgetsWindow(windowName, sections) {
    const win = new BrowserWindow({
      width:  800,
      height: 600,
      frame:  false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      hasShadow: false,
      show: false,
      webPreferences: { nodeIntegration: true }
    });
  
    // build a single HTML page with drag regions
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          /* entire background is draggable */
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            position: relative;
            app-region: drag;
          }
          /* but each widget’s content is not draggable */
          .widget {
            app-region: drag;
          }
        </style>
      </head>
      <body>
    `;
  
    Object.entries(sections).forEach(([name, cfg]) => {
      if (cfg.Type === 'Text') {
        const W = parseInt(cfg.Width  || 200, 10);
        const H = parseInt(cfg.Height || 50,  10);
        html += `
          <div class="widget" style="
            position:absolute;
            left:${cfg.X}px;
            top:${cfg.Y}px;
            width:${W}px;
            height:${H}px;
            display:flex;
            align-items:center;
            justify-content:${(cfg.StringAlign === 'CenterCenter') ? 'center'
                         : (cfg.StringAlign === 'RightCenter') ? 'flex-end'
                         : 'flex-start'};
            color:rgb(${cfg.FontColor});
            font-family:'${cfg.FontFace}';
            font-weight:${cfg.FontWeight};
            font-size:${cfg.FontSize}px;
            -webkit-font-smoothing:${cfg.Antialias === '1' ? 'antialiased' : 'none'};
            ">
            ${cfg.Text}
          </div>
        `;
      }
      // …other Types…
    });
  
    html += `
      </body>
      </html>
    `;
  
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    win.once('ready-to-show', () => win.show());
    win.on('close', e => {
      if (!app.isQuiting) {
        e.preventDefault();
        win.hide();
      }
    });
    return win;
  }
  