//Set DarkMode/ColorTheme.
if (window.deskflex.darkMode) {
  document.body.classList.add("dark-mode");
} else {
  document.body.classList.remove("dark-mode");
}

// Animate addWidget Button
const icon = document.querySelector(".addWidgetIcon");
icon.addEventListener("click", () => {
  icon.classList.add("animate");
  setTimeout(() => icon.classList.remove("animate"), 200);
});

// Open the DeskFlex Config Settings
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-settings");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      window.deskflex.openConfigSettings(window.deskflex.settingsFile);
    });
  }
});

// Close the Window
const btn = document.getElementById("close-window");
btn.addEventListener("click", () => {
  window.deskflex.hideWindow();
});

// create the Logs Window
function createLogsWindow() {
  window.deskflex.createLogsWindow();
}

function addlog() {
  window.deskflex.sendLog("DeskFlex Main Window Loaded", "warning", "");
}
