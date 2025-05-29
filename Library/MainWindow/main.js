// main.js
// Main application entry point

import stateManager from "./state-manager.js";
import { renderTree, initTreeClickListener } from "./tree-renderer.js";
import { hideDetails, disableAll } from "./ui-controller.js";
import {
  attachDropdownBehavior,
  populateDropdown,
} from "./dropdown-manager.js";
import {
  setupPositionInputHandlers,
  setupTransparencyMenuHandlers,
  setupPositionMenuHandlers,
  setupHoverMenuHandlers,
  setupCheckboxHandlers,
  setupDeskflexEventListeners,
  setupMainButtonHandlers,
} from "./event-handlers.js";

// Initialize the application when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  // Initialize state manager and UI elements
  stateManager.initializeElements();

  // Set initial UI state
  hideDetails();
  disableAll();

  // Render the folder tree
  renderTree(
    document.getElementById("folderTree"),
    window.deskflex.folderStructure
  );

  // Initialize tree click listener
  initTreeClickListener();

  // Setup all event handlers
  setupMainButtonHandlers();
  setupPositionInputHandlers();
  setupTransparencyMenuHandlers();
  setupPositionMenuHandlers();
  setupHoverMenuHandlers();
  setupCheckboxHandlers();
  setupDeskflexEventListeners();

  // Setup dropdown behaviors
  attachDropdownBehavior("#toggle-Dropdown", "myDropdown");
  document.querySelectorAll("[data-target]").forEach((box) => {
    attachDropdownBehavior(
      `[data-target="${box.dataset.target}"]`,
      box.dataset.target
    );
  });

  // Initial dropdown population
  populateDropdown();
});
