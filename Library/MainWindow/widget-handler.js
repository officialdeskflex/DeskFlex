// widget-handler.js
// Handles widget operations and selections

import stateManager from './state-manager.js';
import { buildPath, isWidgetActive } from './utils.js';
import { showDetails, enableLoadEdit, resetOptions } from './ui-controller.js';
import { updateSettingsPanel, captureSettings, applySettings } from './settings-manager.js';
import { resetPlaceholders } from './ui-controller.js';

export function displayWidgetInfo(filePath) {
  const widgetinfo = window.deskflex.getWidgetInfo(filePath) || {};
  document.getElementById("name").textContent = widgetinfo.Name || "-";
  document.getElementById("author").textContent = widgetinfo.Author || "-";
  document.getElementById("version").textContent = widgetinfo.Version || "-";
  document.getElementById("license").textContent = widgetinfo.License || "-";
  document.getElementById("information").textContent =
    widgetinfo.Information || "No additional info.";

  const parts = filePath.split("\\");
  const fileName = parts.pop();
  const idxWidget = parts.indexOf("Widgets");
  const widgetArr = idxWidget >= 0 ? parts.slice(idxWidget + 1) : parts;

  const widgetSection = widgetArr.concat(fileName).join("\\");
  stateManager.setCurrentWidget(widgetSection, filePath);
  
  document.getElementById("main-ini").textContent = fileName;
  document.getElementById("widget").textContent = widgetArr.join("\\") || "-";
}

export function handleActiveWidgetSelection(sec) {
  const base = (window.deskflex.widgetPath || "").replace(/[\/\\]+$/, "");
  const fullPath = buildPath(base, sec);

  stateManager.setCurrentWidget(sec, fullPath);

  displayWidgetInfo(fullPath);
  showDetails();
  enableLoadEdit();

  const { loadButton, refreshButton, windowSettings, checkboxContainer, addWidgetLink } = stateManager.uiElements;
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
    console.log("No WidgetInfo section found for", fullPath);
  } else {
    addWidgetLink.classList.add("hidden");
    console.log("WidgetInfo section found for", fullPath);
  }
}

export function onLoadUnload() {
  const sec = stateManager.currentWidgetSection;
  const filePath = stateManager.currentFlexFilePath;
  if (!sec) return;

  const { loadButton, refreshButton, windowSettings, checkboxContainer } = stateManager.uiElements;
  const isLoadMode = loadButton.textContent.trim().toLowerCase() === "load";
  const action = isLoadMode ? "loadWidget" : "unloadWidget";
  
  window.deskflex[action](sec)
    .then((result) => {
      if (!result.success) {
        console.error(
          `Failed to ${isLoadMode ? "load" : "unload"} widget:`,
          result.message
        );
        return;
      }

      if (isLoadMode) {
        stateManager.saveOriginalSettings(sec, captureSettings(sec));

        loadButton.textContent = "Unload";
        refreshButton.disabled = false;
        refreshButton.classList.remove("disabled");
        windowSettings.style.opacity = "1";
        checkboxContainer.style.opacity = "1";
        resetOptions();
        updateSettingsPanel(sec);
      } else {
        enableLoadEdit();
        windowSettings.style.opacity = "0.5";
        checkboxContainer.style.opacity = "0.5";
        const originalSettings = stateManager.getOriginalSettings(sec);
        if (originalSettings) {
          applySettings(originalSettings);
        }
        resetPlaceholders();
      }
    })
    .catch((err) =>
      console.error(
        `IPC error on ${isLoadMode ? "load" : "unload"} widget:`,
        err
      )
    );
}