import stateManager from "./state-manager.js";
import { getFullPath, isWidgetActive } from "./utils.js";
import { displayWidgetInfo } from "./widget-handler.js";
import {
  showDetails,
  hideDetails,
  enableLoadEdit,
  disableAll,
  resetOptions,
} from "./ui-controller.js";
import { updateSettingsPanel } from "./settings-manager.js";

export function selectItemHandler(item) {
  stateManager.setSelectedItem(item);

  const name = item.querySelector("span:last-child").textContent;
  const {
    loadButton,
    refreshButton,
    windowSettings,
    checkboxContainer,
    addWidgetLink,
  } = stateManager.uiElements;

  if (name.toLowerCase().endsWith(".ini")) {
    const fullPath = getFullPath(item);
    stateManager.setCurrentWidget(stateManager.currentWidgetSection, fullPath);

    displayWidgetInfo(fullPath);
    showDetails();
    enableLoadEdit();

    const sec = stateManager.currentWidgetSection;
    const isActive = isWidgetActive(window.deskflex.getWidgetStatus(sec));

    if (isActive) {
      loadButton.textContent = "Unload";
      refreshButton.disabled = false;
      refreshButton.classList.remove("disabled");
      windowSettings.style.opacity = "1";
      checkboxContainer.style.opacity = "1";
      resetOptions();
      updateSettingsPanel(sec);
    } else {
      loadButton.textContent = "Load";
      refreshButton.disabled = true;
      refreshButton.classList.add("disabled");
      windowSettings.style.opacity = "0.5";
      checkboxContainer.style.opacity = "0.5";
    }

    if (!window.deskflex.hasWidgetInfoSection(fullPath)) {
      addWidgetLink.classList.remove("hidden");
    } else {
      addWidgetLink.classList.add("hidden");
    }
  } else {
    hideDetails();
    disableAll();
    addWidgetLink.classList.add("hidden");
  }
}
