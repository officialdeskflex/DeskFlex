import { handleActiveWidgetSelection } from "./widget-handler.js";

export function populateDropdown() {
  const dropdown = document.getElementById("myDropdown");
  dropdown.innerHTML = "";

  const widgets = window.deskflex.activeWidget() || [];

  if (widgets.length) {
    widgets.forEach((sec) => {
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

export function toggleDropdown() {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector(".rectangleActiveList");
  dropdown.classList.toggle("show");
  rectangle.classList.toggle("open");
}

export function closeDropdownOnClickOutside(event) {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector(".rectangleActiveList");
  if (!rectangle.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove("show");
    rectangle.classList.remove("open");
  }
}

export function setDropdown(type, label) {
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

export function attachDropdownBehavior(triggerSelector, menuId) {
  const trigger = document.querySelector(triggerSelector);
  const menu = document.getElementById(menuId);
  if (!trigger || !menu) return;

  trigger.addEventListener("click", (e) => {
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

  document.addEventListener("click", (e) => {
    if (!trigger.contains(e.target) && menu.classList.contains("show")) {
      menu.classList.remove("show");
      trigger.classList.remove("open");
      menu.classList.remove("dropup");
    }
  });
}
