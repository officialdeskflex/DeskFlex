function initializeHoverBehavior(container, hoverType, transparencyPercent) {
  const hasTransparency = !isNaN(transparencyPercent);
  const transparency = hasTransparency ? transparencyPercent / 100 : 1.0;

  if (hoverType !== 0) {
    let initialOpacity;
    switch (hoverType) {
      case 1: 
        initialOpacity = transparency;
        break;
      case 2: 
        initialOpacity = transparency;
        break;
      case 3: 
        initialOpacity = 1.0;
        break;
      default:
        initialOpacity = transparency;
    }
    container.style.opacity = initialOpacity;
    container.style.transition = "opacity 0.5s";

    container.addEventListener("mouseenter", () => {
      switch (hoverType) {
        case 1: container.style.opacity = 0;            break; 
        case 2: container.style.opacity = 1.0;          break; 
        case 3: container.style.opacity = transparency; break;
      }
    });

    container.addEventListener("mouseleave", () => {
      switch (hoverType) {
        case 1: container.style.opacity = transparency; break;
        case 2: container.style.opacity = transparency; break; 
        case 3: container.style.opacity = 1.0;          break; 
      }
    });
  }
}

module.exports = { initializeHoverBehavior };