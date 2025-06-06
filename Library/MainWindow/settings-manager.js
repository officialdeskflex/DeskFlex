import { iniOptionMap, posMap, hoverMap } from "./constants.js";
import { isSupportedOption, isOptionChecked } from "./utils.js";
import { setDropdown } from "./dropdown-manager.js";
import stateManager from "./state-manager.js";

export function captureSettings(sec) {
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

export function applySettings(settings) {
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

  const { checkboxContainer } = stateManager.uiElements;
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

export function updateSettingsPanel(sec) {
  const { checkboxContainer, windowSettings } = stateManager.uiElements;

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
  setDropdown("hover", hoverMap[String(window.deskflex.getWidgetOnHover(sec))]);
}

export function updateOptionUI(label, widgetId, newVal) {
  if (widgetId !== stateManager.currentWidgetSection) return;

  const { checkboxContainer } = stateManager.uiElements;
  const option = Array.from(checkboxContainer.querySelectorAll(".option")).find(
    (o) => o.querySelector("label").textContent.trim() === label
  );
  if (!option || option.classList.contains("disabled")) return;
  option.classList.toggle("checked", Boolean(newVal));
}
