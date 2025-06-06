/**
 * Build CSS transform string from shape transforms
 * @param {object} transforms - Transform configuration object
 * @param {number} width - Shape width for anchor calculations
 * @param {number} height - Shape height for anchor calculations
 * @returns {string} CSS transform string
 */
function buildTransformString(transforms, width, height) {
  if (!transforms) return "";

  const transformParts = [];
  const order = transforms.transformOrder || [
    "rotate",
    "scale",
    "skew",
    "offset",
  ];

  const getAnchor = (anchorX, anchorY) => {
    const x = anchorX !== null ? anchorX : width / 2;
    const y = anchorY !== null ? anchorY : height / 2;
    return { x, y };
  };

  for (const transformType of order) {
    switch (transformType) {
      case "rotate":
        if (transforms.rotate && transforms.rotate.angle !== 0) {
          const angle = transforms.rotate.angle;
          const anchor = getAnchor(
            transforms.rotate.anchorX,
            transforms.rotate.anchorY
          );

          if (
            transforms.rotate.anchorX !== null ||
            transforms.rotate.anchorY !== null
          ) {
            transformParts.push(`translate(${anchor.x}px, ${anchor.y}px)`);
            transformParts.push(`rotate(${angle}deg)`);
            transformParts.push(`translate(${-anchor.x}px, ${-anchor.y}px)`);
          } else {
            transformParts.push(`rotate(${angle}deg)`);
          }
        }
        break;

      case "scale":
        if (
          transforms.scale &&
          (transforms.scale.x !== 1.0 || transforms.scale.y !== 1.0)
        ) {
          const scaleX = transforms.scale.x;
          const scaleY = transforms.scale.y;
          const anchor = getAnchor(
            transforms.scale.anchorX,
            transforms.scale.anchorY
          );

          if (
            transforms.scale.anchorX !== null ||
            transforms.scale.anchorY !== null
          ) {
            transformParts.push(`translate(${anchor.x}px, ${anchor.y}px)`);
            transformParts.push(`scale(${scaleX}, ${scaleY})`);
            transformParts.push(`translate(${-anchor.x}px, ${-anchor.y}px)`);
          } else {
            transformParts.push(`scale(${scaleX}, ${scaleY})`);
          }
        }
        break;

      case "skew":
        if (
          transforms.skew &&
          (transforms.skew.x !== 0.0 || transforms.skew.y !== 0.0)
        ) {
          const skewX = transforms.skew.x;
          const skewY = transforms.skew.y;
          const anchor = getAnchor(
            transforms.skew.anchorX,
            transforms.skew.anchorY
          );

          if (
            transforms.skew.anchorX !== null ||
            transforms.skew.anchorY !== null
          ) {
            transformParts.push(`translate(${anchor.x}px, ${anchor.y}px)`);
            transformParts.push(`skew(${skewX}deg, ${skewY}deg)`);
            transformParts.push(`translate(${-anchor.x}px, ${-anchor.y}px)`);
          } else {
            transformParts.push(`skew(${skewX}deg, ${skewY}deg)`);
          }
        }
        break;

      case "offset":
        if (
          transforms.offset &&
          (transforms.offset.x !== 0 || transforms.offset.y !== 0)
        ) {
          transformParts.push(
            `translate(${transforms.offset.x}px, ${transforms.offset.y}px)`
          );
        }
        break;
    }
  }

  return transformParts.length > 0 ? transformParts.join(" ") : "";
}

module.exports = { buildTransformString };