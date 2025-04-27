/**
 * Set DarkMode/ColorTheme.
 */
if (window.deskflex.darkMode) {
  document.body.classList.add('dark-mode');
} else {
  document.body.classList.remove('dark-mode');
}

/**
 * Dynamically populate dropdown from activeFlex.
 */
function populateDropdown() {
  const dropdown = document.getElementById("myDropdown");
  dropdown.innerHTML = "";
  if (Array.isArray(window.deskflex.activeFlex)) {
    window.deskflex.activeFlex.forEach(item => {
      const option = document.createElement("a");
      option.href = "#";
      option.textContent = item;
      dropdown.appendChild(option);
    });
  }
}

function toggleDropdown() {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector('.rectangleActiveList');
  dropdown.classList.toggle("show");
  rectangle.classList.toggle("open");
}

function closeDropdownOnClickOutside(event) {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector('.rectangleActiveList');
  if (!rectangle.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove("show");
    rectangle.classList.remove("open");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("toggle-Dropdown");
  if (openBtn) {
    openBtn.addEventListener("click", toggleDropdown);
  }
  window.addEventListener('click', closeDropdownOnClickOutside);
  window.addEventListener('DOMContentLoaded', populateDropdown);
});

/**
 * Animate AddFlex Button
 */
const icon = document.querySelector('.addFlexIcon');
icon.addEventListener('click', () => {
  icon.classList.add('animate');
  setTimeout(() => icon.classList.remove('animate'), 200);
});

/**
 * Open the DeskFlex Config Settings
 */
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-settings");
  if (openBtn) {
    openBtn.addEventListener("click", openSettings);
  }
});

function openSettings() {
  window.deskflex.openConfigSettings(window.deskflex.settingsFile);
}

/**
 * Close the Window
 */

const btn = document.getElementById('close-window');
btn.addEventListener('click', () => {
  window.deskflex.hideWindow();
});

/**
 * Animate AddFlex Button
 */
//console.log(JSON.stringify(window.deskflex.folderStructure, null, 2));
console.log(window.deskflex.activeFlex);
console.log("Settings File Found:" + window.deskflex.settingsFile)



document.querySelectorAll('[data-target]').forEach(box => {
  const menu = document.getElementById(box.dataset.target);
  box.addEventListener('click', e => {
    e.stopPropagation();
    const open = menu.classList.toggle('show');
    box.classList.toggle('open', open);
  });
  document.addEventListener('click', () => {
    menu.classList.remove('show');
    box.classList.remove('open');
  });
});