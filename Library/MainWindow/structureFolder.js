// Globals and mappings
let selectedItem = null;
let detailsPanel, actionButtons, loadButton, refreshButton, editButton;
let windowSettings, checkboxContainer, addWidgetLink;

// Store original settings per section for restore on unload
const originalSettings = {};

// Maps for dropdown labels
const posMap = {
  2: "Stay topmost",
  1: "Topmost",
  0: "Normal",
  "-1": "Bottom",
  "-2": "On Desktop",
};
const hoverMap = { 0: "Do Nothing", 1: "Hide", 2: "Fade in", 3: "Fade out" };

window.currentWidgetSection = "";
window.currentFlexFilePath = "";

window.addEventListener("DOMContentLoaded", () => {
  // Grab UI elements
  detailsPanel = document.getElementById("details-panel");
  actionButtons = document.querySelector(".action-button-container");
  loadButton = actionButtons.querySelector("button:first-child");
  refreshButton = actionButtons.querySelector("button:nth-child(2)");
  editButton = actionButtons.querySelector("button:nth-child(3)");
  windowSettings = document.querySelector(".container-positions");
  checkboxContainer = document.querySelector(".checkbox-container");
  addWidgetLink = document.querySelector(".add-widget-info");

  // Initial UI state
  addWidgetLink.classList.add("hidden");
  windowSettings.style.opacity = "0.5";
  checkboxContainer.style.opacity = "0.5";
  hideDetails();
  disableAll();

  // Build folder tree and wire INI clicks
  renderTree(
    document.getElementById("folderTree"),
    window.deskflex.folderStructure
  );
  initIniClickListener();

  // Load / Unload button
  loadButton.addEventListener("click", onLoadUnload);

  // Edit button opens the .ini in config settings
  editButton.addEventListener("click", () => {
    if (window.currentFlexFilePath) {
      window.deskflex.openConfigSettings(window.currentFlexFilePath);
    }
  });

  // Active-Widget dropdown toggle
  const openBtn = document.getElementById("toggle-Dropdown");
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  // Close dropdown on outside click
  window.addEventListener("click", closeDropdownOnClickOutside);

  // Populate Active-Widget list
  populateDropdown();

  // Wire any custom dropdowns (data-target)
  document.querySelectorAll("[data-target]").forEach((box) => {
    const menu = document.getElementById(box.dataset.target);
    box.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle("show");
      box.classList.toggle("open", isOpen);
      if (isOpen) {
        requestAnimationFrame(() => {
          const rect = menu.getBoundingClientRect();
          menu.classList.toggle("dropup", rect.bottom > window.innerHeight);
        });
      } else {
        menu.classList.remove("dropup");
      }
    });
    document.addEventListener("click", (e) => {
      if (!box.contains(e.target) && menu.classList.contains("show")) {
        menu.classList.remove("show");
        box.classList.remove("open");
        menu.classList.remove("dropup");
      }
    });
  });
});

// Capture current settings from deskflex for a given section
function captureSettings(sec) {
  return {
    x: window.deskflex.getWidgetWindowX(sec) || "",
    y: window.deskflex.getWidgetWindowY(sec) || "",
    loadOrder: window.deskflex.getWidgetLoadOrder(sec) || "",
    position: String(window.deskflex.getWidgetPosition(sec)),
    transparency: String(window.deskflex.getWidgetTransparency(sec)),
    hover: String(window.deskflex.getWidgetOnHover(sec)),
    options: {
      "Click Through": window.deskflex.getWidgetClickthrough(sec),
      Draggable: window.deskflex.getWidgetDraggable(sec),
      "Snap Edges": window.deskflex.getWidgetSnapEdges(sec),
      "Keep On Screen": window.deskflex.getWidgetKeepOnScreen(sec),
      "Save Position": window.deskflex.getWidgetSavePosition(sec),
      Favorite: window.deskflex.getWidgetFavorite(sec),
    },
  };
}

// Apply a settings snapshot back into the UI
function applySettings(settings) {
  document.querySelector(".coords-input-x").value = settings.x;
  document.querySelector(".coords-input-y").value = settings.y;
  document.querySelector(".load-order-input").value = settings.loadOrder;

  setDropdown("position", posMap[settings.position] || "Select…");
  setDropdown(
    "transparency",
    ((pct) => (pct >= 0 && pct <= 100 ? `${pct}%` : "Select…"))(
      parseInt(settings.transparency, 10)
    )
  );
  setDropdown("hover", hoverMap[settings.hover] || "Select…");

  Array.from(checkboxContainer.querySelectorAll(".option")).forEach(
    (option) => {
      const label = option.querySelector("label").textContent.trim();
      const val = settings.options[label];
      const supported = val === 1 || val === "1" || val === 0 || val === "0";
      if (supported) {
        option.classList.remove("disabled");
        option.style.opacity = "1";
      } else {
        option.classList.add("disabled");
        option.style.opacity = "";
      }
      option.classList.toggle("checked", val === 1 || val === "1");
    }
  );
}

// Load / Unload widget handler
function onLoadUnload() {
  const sec = window.currentWidgetSection;
  const filePath = window.currentFlexFilePath;
  if (!sec) return;

  const isLoadMode = loadButton.textContent.trim().toLowerCase() === "load";
  const action = isLoadMode ? "loadWidget" : "unloadWidget";

  window.deskflex[action](sec)
    .then(() => {
      if (isLoadMode) {
        // Snapshot original settings
        originalSettings[sec] = captureSettings(sec);

        loadButton.textContent = "Unload";
        refreshButton.disabled = false;
        refreshButton.classList.remove("disabled");
        windowSettings.style.opacity = "1";
        checkboxContainer.style.opacity = "1";
        resetOptions();
        updateSettingsPanel(sec);
      } else {
        // Unload mode
        enableLoadEdit();
        windowSettings.style.opacity = "0.5";
        checkboxContainer.style.opacity = "0.5";
        if (originalSettings[sec]) {
          applySettings(originalSettings[sec]);
        }

        // Reset placeholders
        resetPlaceholders();
      }
    })
    .catch((err) =>
      console.error(`Failed to ${isLoadMode ? "load" : "unload"} widget:`, err)
    );
}
// Handle selection from Active-Widget dropdown
function handleActiveWidgetSelection(sec) {
  const base = (
    window.deskflex.widgetPath ||
    window.deskflex.widgetPath ||
    ""
  ).replace(/[\/\\]+$/, "");
  const fullPath = `${base}\\${sec}`;

  window.currentWidgetSection = sec;
  window.currentFlexFilePath = fullPath;

  displayWidgetInfo(fullPath);
  showDetails();
  enableLoadEdit();

  const statusVal = window.deskflex.getWidgetStatus(sec);
  const isActive = statusVal === 1 || statusVal === "1";
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

  // ALWAYS pass full file path here
  if (!window.deskflex.hasWidgetInfoSection(fullPath)) {
    addWidgetLink.classList.remove("hidden");
    console.log("No WidgetInfo section found for", fullPath);
  } else {
    addWidgetLink.classList.add("hidden");
    console.log("WidgetInfo section found for", fullPath);
  }
}

// Tree item click handler
function selectItem(item) {
  if (selectedItem) selectedItem.classList.remove("selected");
  item.classList.add("selected");
  selectedItem = item;

  const name = item.querySelector("span:last-child").textContent;
  if (name.toLowerCase().endsWith(".ini")) {
    const fullPath = getFullPath(item);
    window.currentFlexFilePath = fullPath;

    displayWidgetInfo(fullPath);
    showDetails();
    enableLoadEdit();

    const sec = window.currentWidgetSection;
    const statusVal = window.deskflex.getWidgetStatus(sec);
    const isActive = statusVal === 1 || statusVal === "1";
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

// Recursively render folder/INI tree
function renderTree(container, obj, path = "") {
  Object.entries(obj).forEach(([name, subtree]) => {
    const item = document.createElement("div");
    item.className = "tree-item";
    const header = document.createElement("div");
    header.className = "tree-node";
    const icon = document.createElement("span");
    icon.className = "icon";
    const label = document.createElement("span");
    label.textContent = name;
    header.append(icon, label);
    item.append(header);

    if (subtree && typeof subtree === "object") {
      icon.textContent = "\ue643"; // closed folder
      icon.classList.add("folder-icon");
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        item.classList.toggle("open");
        icon.textContent = item.classList.contains("open")
          ? "\uf42e"
          : "\ue643";
        selectItem(item);
      });
      const children = document.createElement("div");
      children.className = "children";
      item.append(children);
      renderTree(children, subtree, path ? `${path}\\${name}` : name);
    } else {
      icon.textContent = "\ue269"; // file icon
      icon.classList.add("file-icon");
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItem(item);
      });
    }
    container.append(item);
  });
}

// Listen for clicks deeper in the tree (no-op here, kept for future)
function initIniClickListener() {
  document.getElementById("folderTree").addEventListener(
    "click",
    (e) => {
      const header = e.target.closest(".tree-node");
      if (!header) return;
      const name = header.querySelector("span:last-child").textContent;
      if (!name.toLowerCase().endsWith(".ini")) return;
    },
    true
  );
}

function hideDetails() {
  detailsPanel.classList.add("hidden");
}
function showDetails() {
  detailsPanel.classList.remove("hidden");
}

function disableAll() {
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

function enableLoadEdit() {
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

function resetOptions() {
  checkboxContainer.querySelectorAll(".option").forEach((opt) => {
    opt.classList.add("disabled");
    opt.classList.remove("checked");
  });
}

// Display metadata from the INI and set currentWidgetSection based on path
function displayWidgetInfo(filePath) {
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

  window.currentWidgetSection = widgetArr.concat(fileName).join("\\");
  document.getElementById("main-ini").textContent = fileName;
  document.getElementById("widget").textContent = widgetArr.join("\\") || "-";
}

// Compute full path from tree item
function getFullPath(item) {
  const segs = [];
  let node = item;
  while (node) {
    segs.unshift(node.querySelector("span:last-child").textContent);
    node = node
      .closest(".children")
      ?.parentElement.querySelector(":scope > .tree-node");
  }
  const base = (
    window.deskflex.widgetPath ||
    window.deskflex.widgetPath ||
    ""
  ).replace(/[\/\\]+$/, "");
  return `${base}\\${segs.join("\\")}`;
}

// Populate & wire Active-Widget dropdown
function populateDropdown() {
  const dropdown = document.getElementById("myDropdown");
  dropdown.innerHTML = "";
  if (
    Array.isArray(window.deskflex.activeWidget) &&
    window.deskflex.activeWidget.length
  ) {
    window.deskflex.activeWidget.forEach((sec) => {
      const option = document.createElement("a");
      option.href = "#";
      option.textContent = sec;
      option.addEventListener("click", (e) => {
        e.preventDefault();
        handleActiveWidgetSelection(sec);
      });
      dropdown.appendChild(option);
    });
  } else {
    const noItem = document.createElement("a");
    noItem.href = "#";
    noItem.textContent = "No Active Widget";
    noItem.style.pointerEvents = "none";
    noItem.style.opacity = "0.6";
    dropdown.appendChild(noItem);
  }
}

// Toggle the Active-Widget dropdown
function toggleDropdown() {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector(".rectangleActiveList");
  dropdown.classList.toggle("show");
  rectangle.classList.toggle("open");
}

// Close it when clicking elsewhere
function closeDropdownOnClickOutside(event) {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector(".rectangleActiveList");
  if (!rectangle.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove("show");
    rectangle.classList.remove("open");
  }
}

// Updated Settings Panel
function updateSettingsPanel(sec) {
  const checks = [
    ["Click Through", window.deskflex.getWidgetClickthrough],
    ["Draggable", window.deskflex.getWidgetDraggable],
    ["Snap Edges", window.deskflex.getWidgetSnapEdges],
    ["Keep On Screen", window.deskflex.getWidgetKeepOnScreen],
    ["Save Position", window.deskflex.getWidgetSavePosition],
    ["Favorite", window.deskflex.getWidgetFavorite],
  ];

  checks.forEach(([label, getter]) => {
    const val = getter(sec);
    const option = Array.from(
      checkboxContainer.querySelectorAll(".option")
    ).find((o) => o.querySelector("label").textContent.trim() === label);
    if (!option) return;

    // Enable for both 0 and 1
    const supported = val === 1 || val === "1" || val === 0 || val === "0";
    if (supported) {
      option.classList.remove("disabled");
      option.style.opacity = "1";
    } else {
      option.classList.add("disabled");
      option.style.opacity = "";
    }

    // Only check when val === 1
    option.classList.toggle("checked", val === 1 || val === "1");
  });

  windowSettings.classList.remove("disabled");
  document
    .querySelectorAll(".coords-input, .load-order-input")
    .forEach((i) => (i.disabled = false));

  document.querySelector(".coords-input-x").value =
    window.deskflex.getWidgetWindowX(sec) || "";
  document.querySelector(".coords-input-y").value =
    window.deskflex.getWidgetWindowY(sec) || "";
  document.querySelector(".load-order-input").value =
    window.deskflex.getWidgetLoadOrder(sec) || "";

  setDropdown(
    "position",
    posMap[String(window.deskflex.getWidgetPosition(sec))]
  );
  setDropdown(
    "transparency",
    ((pct) => (pct >= 0 && pct <= 100 ? `${pct}%` : "Select…"))(
      parseInt(window.deskflex.getWidgetTransparency(sec), 10)
    )
  );
  setDropdown("hover", hoverMap[String(window.deskflex.getWidgetOnHover(sec))]);
}

// Helper to set dropdown UI
function setDropdown(type, label) {
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
      node.textContent = label || "Select…";
      break;
    }
  }
  Array.from(menu.querySelectorAll("a")).forEach((a) =>
    a.classList.toggle("selected", a.textContent.trim() === label)
  );
}

function resetPlaceholders() {
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
