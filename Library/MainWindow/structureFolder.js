//StructureFolder.js
// Globals and mappings
let selectedItem = null;
let detailsPanel, actionButtons, loadButton, refreshButton, editButton;
let windowSettings, checkboxContainer, addWidgetLink;

const originalSettings = {};

const posMap = {
  2: "Stay topmost",
  1: "Topmost",
  0: "Normal",
  "-1": "Bottom",
  "-2": "On Desktop",
};

const iniOptionMap = {
  "Click Through": { iniKey: "ClickThrough", getter: window.deskflex.getWidgetClickthrough },
  "Draggable":       { iniKey: "Draggable",   getter: window.deskflex.getWidgetDraggable    },
  "Snap Edges":      { iniKey: "SnapEdges",     getter: window.deskflex.getWidgetSnapEdges      },
  "Keep On Screen":  { iniKey: "KeepOnScreen", getter: window.deskflex.getWidgetKeepOnScreen  },
  "Save Position":   { iniKey: "SavePosition", getter: window.deskflex.getWidgetSavePosition  },
  "Favorite":        { iniKey: "Favorite",    getter: window.deskflex.getWidgetFavorite      },
};

const iniSetterMap = {
  "Click Through":   window.deskflex.setClickThrough,
  "Draggable":       window.deskflex.setDraggable,
  "Snap Edges":      window.deskflex.setSnapEdges,
  "Keep On Screen":  window.deskflex.setKeepOnScreen,
  "Save Position":   window.deskflex.setSavePosition,
  "Favorite":        window.deskflex.setFavorite,
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

  addWidgetLink.classList.add("hidden");
  windowSettings.style.opacity = "0.5";
  checkboxContainer.style.opacity = "0.5";
  hideDetails();
  disableAll();

  renderTree(
    document.getElementById("folderTree"),
    window.deskflex.folderStructure
  );
  initIniClickListener();
  loadButton.addEventListener("click", onLoadUnload);
  editButton.addEventListener("click", () => {
    if (window.currentFlexFilePath) {
      window.deskflex.openConfigSettings(window.currentFlexFilePath);
    }
  });
  attachDropdownBehavior("#toggle-Dropdown", "myDropdown");
  document.querySelectorAll("[data-target]").forEach(box => {
    attachDropdownBehavior(
      `[data-target="${box.dataset.target}"]`,
      box.dataset.target
    );
  });
  populateDropdown();
  window.deskflex.onWidgetStatusChanged((section) => {
    populateDropdown();
    if (window.currentWidgetSection === section) {
      handleActiveWidgetSelection(section);
    }
    
    const xInput = document.querySelector('.coords-input-x');
    const yInput = document.querySelector('.coords-input-y');

[xInput, yInput].forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      // parse both coords (fallback to zero)
      const x = parseInt(xInput.value, 10) || 0;
      const y = parseInt(yInput.value, 10) || 0;
      // send the IPC call
      window.deskflex.moveWidgetWindow(x, y, window.currentWidgetSection);
    }
  });
});

document.querySelectorAll('#transparencyMenu a')
    .forEach(option => {
      option.addEventListener('click', e => {
        e.preventDefault();
        const text = option.textContent.trim();
        const percent = parseInt(text.replace('%',''), 10);
        window.deskflex.setTransparency(percent, window.currentWidgetSection);
        setDropdown('transparency', text);
      });
    });

  });

  const reverseHoverMap = Object.fromEntries(
  Object.entries(hoverMap).map(([k, v]) => [v, parseInt(k, 10)])
  );


document.querySelectorAll('#hoverMenu a')
  .forEach(option => {
    option.addEventListener('click', e => {
      e.preventDefault();
      const label = option.textContent.trim();
      const code = reverseHoverMap[label];
      if (code === undefined) return;
      // send IPC to set hover type
      window.deskflex.setHoverType(code, window.currentWidgetSection);
      // update the UI label
      console.log("Called the IPC")
      setDropdown('hover', label);
    });
  });

  checkboxContainer.addEventListener('click', async e => {
  const option = e.target.closest('.option');
  if (!option || option.classList.contains('disabled')) return;
  const label    = option.querySelector('label').textContent.trim();
  const mapping  = iniOptionMap[label];
  const setter   = iniSetterMap[label];
  const sec      = window.currentWidgetSection;
  if (!mapping || !sec || typeof setter !== 'function') return;
  const oldVal = Number(mapping.getter(sec));
  const newVal = oldVal === 1 ? 0 : 1;
  option.classList.toggle("checked", newVal === 1);
  setter(newVal, sec);
  console.log(`Sent ${label}=${newVal} for widget ${sec}`);
});
});

function updateOptionUI(label, widgetId, newVal) {
  if (widgetId !== window.currentWidgetSection) return;
  const option = Array.from(checkboxContainer.querySelectorAll(".option"))
    .find(o => o.querySelector("label").textContent.trim() === label);
  if (!option || option.classList.contains("disabled")) return;
  option.classList.toggle("checked", Boolean(newVal));
}

function captureSettings(sec) {
const opts = {};
  for (const [label, mapping] of Object.entries(iniOptionMap)) {
    opts[label] = mapping.getter(sec);
  }
  return {
    x: window.deskflex.getWidgetWindowX(sec) || "",
    y: window.deskflex.getWidgetWindowY(sec) || "",
    loadOrder: window.deskflex.getWidgetLoadOrder(sec) || "",
    position: String(window.deskflex.getWidgetPosition(sec)),
    transparency: String(window.deskflex.getWidgetTransparency(sec)),
    hover: String(window.deskflex.getWidgetOnHover(sec)),
    options: opts,
  };
}

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
      const supported = isSupportedOption(val);
      if (supported) {
        option.classList.remove("disabled");
        option.style.opacity = "1";
      } else {
        option.classList.add("disabled");
        option.style.opacity = "";
      }
      option.classList.toggle("checked", isOptionChecked(val));
    }
  );
}

function onLoadUnload() {
  const sec = window.currentWidgetSection;
  const filePath = window.currentFlexFilePath;
  if (!sec) return;

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
          originalSettings[sec] = captureSettings(sec);

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
          if (originalSettings[sec]) {
            applySettings(originalSettings[sec]);
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

function handleActiveWidgetSelection(sec) {
  const base = (window.deskflex.widgetPath || "").replace(/[\/\\]+$/, "");
  const fullPath = buildPath(base, sec);

  window.currentWidgetSection = sec;
  window.currentFlexFilePath = fullPath;

  displayWidgetInfo(fullPath);
  showDetails();
  enableLoadEdit();

  const statusVal = window.deskflex.getWidgetStatus(sec);
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
      icon.textContent = "\ue643"; 
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
      icon.textContent = "\ue269";
      icon.classList.add("file-icon");
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItem(item);
      });
    }
    container.append(item);
  });
}

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

function getFullPath(item) {
  const segs = [];
  let node = item;
  while (node) {
    segs.unshift(node.querySelector("span:last-child").textContent);
    node = node
      .closest(".children")
      ?.parentElement.querySelector(":scope > .tree-node");
  }
  const base = (window.deskflex.widgetPath  || "").replace(/[\/\\]+$/, "");
  return buildPath(base, ...segs);
}

function populateDropdown() {
  const dropdown = document.getElementById('myDropdown');
  dropdown.innerHTML = '';

  const widgets = window.deskflex.activeWidget() || [];

  if (widgets.length) {
    widgets.forEach(sec => {
      const option = document.createElement('a');
      option.href = '#';
      option.textContent = sec;
      option.addEventListener('click', e => {
        e.preventDefault();
        handleActiveWidgetSelection(sec);
      });
      dropdown.appendChild(option);
    });
  } else {
    const noItem = document.createElement('a');
    noItem.href = '#';
    noItem.textContent = 'No Active Widget';
    noItem.style.pointerEvents = 'none';
    noItem.style.opacity = '0.6';
    dropdown.appendChild(noItem);
  }
}

function toggleDropdown() {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector(".rectangleActiveList");
  dropdown.classList.toggle("show");
  rectangle.classList.toggle("open");
}

function closeDropdownOnClickOutside(event) {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector(".rectangleActiveList");
  if (!rectangle.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove("show");
    rectangle.classList.remove("open");
  }
}

function updateSettingsPanel(sec) {
  Object.entries(iniOptionMap).forEach(([label, { getter }]) => {
    const val = getter(sec);
    const option = Array.from(
      checkboxContainer.querySelectorAll(".option")
    ).find((o) => o.querySelector("label").textContent.trim() === label);
    if (!option) return;

    if (isSupportedOption(val)) {
      option.classList.remove("disabled");
      option.style.opacity = "1";
    } else {
      option.classList.add("disabled");
      option.style.opacity = "";
    }

    option.classList.toggle("checked", isOptionChecked(val));
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
  setDropdown(
    "hover",
    hoverMap[String(window.deskflex.getWidgetOnHover(sec))]
  );
}

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

function attachDropdownBehavior(triggerSelector, menuId) {
  const trigger = document.querySelector(triggerSelector);
  const menu   = document.getElementById(menuId);
  if (!trigger || !menu) return;

  trigger.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle("show");
    trigger.classList.toggle("open", isOpen);
    if (isOpen) {
      requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        menu.classList.toggle("dropup", rect.bottom > window.innerHeight);
      });
    } else {
      menu.classList.remove("dropup");
    }
  });

  document.addEventListener("click", e => {
    if (!trigger.contains(e.target) && menu.classList.contains("show")) {
      menu.classList.remove("show");
      trigger.classList.remove("open");
      menu.classList.remove("dropup");
    }
  });
}

function isWidgetActive(val) {
  return String(val) === "1";
}
function isSupportedOption(val) {
  const s = String(val);
  return s === "0" || s === "1";
}
function isOptionChecked(val) {
  return String(val) === "1";
}
function buildPath(...segments) {
  return segments.join("\\").replace(/\\\\+/g, "\\");
}

window.deskflex.onDraggableChange(({ id, value }) => {
  console.log(`ID and Value:${id}||${value}`)
  updateOptionUI("Draggable",       id, value);
});
window.deskflex.onKeepOnScreenChange(({ id, value }) => {
  updateOptionUI("Keep On Screen",  id, value);
});
window.deskflex.onClickthroughChange(({ id, value }) => {
  updateOptionUI("Click Through",   id, value);
});

window.deskflex.onPositionChanged(({ id, x, y }) => {
  if (id !== window.currentWidgetSection) return;
  const xInput = document.querySelector('.coords-input-x');
  const yInput = document.querySelector('.coords-input-y');
  xInput.value = x;
  yInput.value = y;
});