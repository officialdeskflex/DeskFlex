class StateManager {
  constructor() {
    this.selectedItem = null;
    this.originalSettings = {};
    this.currentWidgetSection = "";
    this.currentFlexFilePath = "";
    this.uiElements = {};
  }

  setSelectedItem(item) {
    if (this.selectedItem) {
      this.selectedItem.classList.remove("selected");
    }
    item.classList.add("selected");
    this.selectedItem = item;
  }

  setCurrentWidget(section, filePath) {
    this.currentWidgetSection = section;
    this.currentFlexFilePath = filePath;
    window.currentWidgetSection = section;
    window.currentFlexFilePath = filePath;
  }

  initializeElements() {
    this.uiElements = {
      detailsPanel: document.getElementById("details-panel"),
      actionButtons: document.querySelector(".action-button-container"),
      windowSettings: document.querySelector(".container-positions"),
      checkboxContainer: document.querySelector(".checkbox-container"),
      addWidgetLink: document.querySelector(".add-widget-info"),
    };

    const { actionButtons } = this.uiElements;
    this.uiElements.loadButton =
      actionButtons.querySelector("button:first-child");
    this.uiElements.refreshButton = actionButtons.querySelector(
      "button:nth-child(2)"
    );
    this.uiElements.editButton = actionButtons.querySelector(
      "button:nth-child(3)"
    );

    // Initial state setup
    this.uiElements.addWidgetLink.classList.add("hidden");
    this.uiElements.windowSettings.style.opacity = "0.5";
    this.uiElements.checkboxContainer.style.opacity = "0.5";
  }

  saveOriginalSettings(section, settings) {
    this.originalSettings[section] = settings;
  }

  getOriginalSettings(section) {
    return this.originalSettings[section];
  }

  getUIElement(name) {
    return this.uiElements[name];
  }
}

export default new StateManager();
