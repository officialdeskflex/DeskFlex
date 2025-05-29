// event-handlers.js
// Centralized event handling

import stateManager from "./state-manager.js";
import {
  iniOptionMap,
  iniSetterMap,
  posReverseMap,
  hoverMap,
  posMap
} from "./constants.js";
import { createReverseMap } from "./utils.js";
import { setDropdown, populateDropdown } from "./dropdown-manager.js";
import { updateOptionUI } from "./settings-manager.js";
import { handleActiveWidgetSelection, onLoadUnload } from "./widget-handler.js";

export function setupPositionInputHandlers() {
  const xInput = document.querySelector(".coords-input-x");
  const yInput = document.querySelector(".coords-input-y");

  [xInput, yInput].forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const x = parseInt(xInput.value, 10) || 0;
        const y = parseInt(yInput.value, 10) || 0;
        window.deskflex.moveWidgetWindow(
          x,
          y,
          stateManager.currentWidgetSection
        );
      }
    });
  });
}

export function setupTransparencyMenuHandlers() {
  document.querySelectorAll("#transparencyMenu a").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.preventDefault();
      const text = option.textContent.trim();
      const percent = parseInt(text.replace("%", ""), 10);
      window.deskflex.setTransparency(
        percent,
        stateManager.currentWidgetSection
      );
      setDropdown("transparency", text);
    });
  });
}

export function setupPositionMenuHandlers() {
  document.querySelectorAll("#positionMenu a").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.preventDefault();
      const label = option.textContent.trim();
      const value = posReverseMap[label];

      if (value !== undefined) {
        window.deskflex.setZpos(value, stateManager.currentWidgetSection);
        setDropdown("position", label);
      }
    });
  });
}

export function setupHoverMenuHandlers() {
  const reverseHoverMap = createReverseMap(hoverMap);

  document.querySelectorAll("#hoverMenu a").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.preventDefault();
      const label = option.textContent.trim();
      const code = reverseHoverMap[label];
      if (code === undefined) return;

      window.deskflex.setHoverType(code, stateManager.currentWidgetSection);
      console.log("Called the IPC");
      setDropdown("hover", label);
    });
  });
}

export function setupCheckboxHandlers() {
  const { checkboxContainer } = stateManager.uiElements;

  checkboxContainer.addEventListener("click", async (e) => {
    const option = e.target.closest(".option");
    if (!option || option.classList.contains("disabled")) return;

    const label = option.querySelector("label").textContent.trim();
    const mapping = iniOptionMap[label];
    const setter = iniSetterMap[label];
    const sec = stateManager.currentWidgetSection;

    if (!mapping || !sec || typeof setter !== "function") return;

    const oldVal = Number(mapping.getter(sec));
    const newVal = oldVal === 1 ? 0 : 1;
    option.classList.toggle("checked", newVal === 1);
    setter(newVal, sec);
    console.log(`Sent ${label}=${newVal} for widget ${sec}`);
  });
}

export function setupDeskflexEventListeners() {
  window.deskflex.onWidgetStatusChanged((section) => {
    populateDropdown();
    if (stateManager.currentWidgetSection === section) {
      handleActiveWidgetSelection(section);
    }
  });

  window.deskflex.onDraggableChange(({ id, value }) => {
    console.log(`ID and Value:${id}||${value}`);
    updateOptionUI("Draggable", id, value);
  });

  window.deskflex.onKeepOnScreenChange(({ id, value }) => {
    updateOptionUI("Keep On Screen", id, value);
  });

  window.deskflex.onClickthroughChange(({ id, value }) => {
    updateOptionUI("Click Through", id, value);
  });

  window.deskflex.onPositionChanged(({ id, x, y }) => {
    console.log(`Position changed for ${id}: x=${x}, y=${y}`);
    if (id !== stateManager.currentWidgetSection) return;
    const xInput = document.querySelector(".coords-input-x");
    const yInput = document.querySelector(".coords-input-y");
    xInput.value = x;
    yInput.value = y;
  });

  window.deskflex.onZposChange((data) => {
    console.log(`Zpos changed for ${data.widget}: ${data.value}`);
    if (data.widget === stateManager.currentWidgetSection) {
      const text = posMap[data.value];
      setDropdown("position", text);
    }
  });
}

export function setupMainButtonHandlers() {
  const { loadButton, editButton } = stateManager.uiElements;

  loadButton.addEventListener("click", onLoadUnload);

  editButton.addEventListener("click", () => {
    if (stateManager.currentFlexFilePath) {
      window.deskflex.openConfigSettings(stateManager.currentFlexFilePath);
    }
  });
}
