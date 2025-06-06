import stateManager from "./state-manager.js";

export function hideDetails() {
  stateManager.getUIElement("detailsPanel").classList.add("hidden");
}

export function showDetails() {
  stateManager.getUIElement("detailsPanel").classList.remove("hidden");
}

export function disableAll() {
  const {
    loadButton,
    refreshButton,
    editButton,
    windowSettings,
    checkboxContainer,
  } = stateManager.uiElements;

  [loadButton, refreshButton, editButton].forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("disabled");
  });

  windowSettings.classList.add("disabled");

  checkboxContainer.querySelectorAll(".option").forEach((opt) => {
    opt.classList.add("disabled");
    opt.querySelector(".check-box").textContent = "";
  });
}

export function enableLoadEdit() {
  const {
    loadButton,
    refreshButton,
    editButton,
    windowSettings,
    checkboxContainer,
  } = stateManager.uiElements;

  loadButton.textContent = "Load";

  [loadButton, editButton].forEach((btn) => {
    btn.disabled = false;
    btn.classList.remove("disabled");
  });

  refreshButton.disabled = true;
  refreshButton.classList.add("disabled");
  windowSettings.classList.add("disabled");

  checkboxContainer.querySelectorAll(".option").forEach((opt) => {
    opt.classList.add("disabled");
    opt.querySelector(".check-box").textContent = "";
  });
}

export function resetOptions() {
  const { checkboxContainer } = stateManager.uiElements;

  checkboxContainer.querySelectorAll(".option").forEach((opt) => {
    opt.classList.add("disabled");
    opt.classList.remove("checked");
  });
}

export function resetPlaceholders() {
  const container = document.querySelector(".container-positions");
  container.querySelectorAll('input[type="text"]').forEach((input) => {
    input.value = "";
  });

  ["position", "transparency", "hover"].forEach((type) => {
    const box = document.querySelector(`.${type}-box`);
    const menu = document.getElementById(
      type === "position"
        ? "positionMenu"
        : type === "transparency"
        ? "transparencyMenu"
        : "hoverMenu"
    );

    for (let node of box.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = "Select…";
        break;
      }
    }

    Array.from(menu.querySelectorAll("a")).forEach((a) => {
      a.classList.remove("selected");
    });
  });

  document.querySelectorAll(".option.checked").forEach((option) => {
    option.classList.remove("checked");
  });
}
