const getImageSize = require('../Helper/ImageSize');
const path = require('path');

/**
 * Process image elements in configuration
 * @param {object} widgetConfig - Widget configuration object
 * @param {string} baseDir - Base directory for resolving relative paths
 * @returns {object} Configuration with processed images
 */
function processImages(widgetConfig, baseDir) {
  const processedConfig = { ...widgetConfig };

  for (const cfg of Object.values(processedConfig)) {
    const elementType = (cfg.element || "").trim().toLowerCase();
    if (elementType === "image") {
      let img = (cfg.imagename || cfg.ImageName || "").replace(/"/g, "");
      if (!path.isAbsolute(img)) img = path.join(baseDir, img);
      
      const hasW = cfg.w || cfg.W || cfg.width || cfg.Width;
      const hasH = cfg.h || cfg.H || cfg.height || cfg.Height;
      
      if (!hasW || !hasH) {
        try {
          const sz = getImageSize(img);
          if (!hasW) {
            cfg.w = sz.width;
            cfg.W = sz.width;
          }
          if (!hasH) {
            cfg.h = sz.height;
            cfg.H = sz.height;
          }
        } catch (e) {
          console.warn(`Could not size ${img}:`, e);
        }
      }
    }
  }

  return processedConfig;
}

module.exports = {
  processImages,
};  