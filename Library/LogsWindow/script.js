let lastLogCount = 0;
const iconMap = {
  info: "\uF4A5",
  error: "\uF352",
  warning: "\uF86A",
  debug: "\uF86A",
};

// Set DarkMode/ColorTheme.
if (window.deskflex.darkMode) {
  document.body.classList.add("dark-mode");
} else {
  document.body.classList.remove("dark-mode");
}

// Clear and entirely re-render logs (used when toggling filters).
function resetLogs() {
  lastLogCount = 0;
  document.getElementById("logsBody").innerHTML = "";
  updateLogs();
}

function clearAllLogs() {
  window.deskflex.clearAllLogs().then(() => {
    lastLogCount = 0;
    document.getElementById("logsBody").innerHTML = "";
    updateLogs();
  });
}
function updateLogs() {
  window.deskflex.getLogs().then((logs) => {
    const tbody = document.getElementById("logsBody");
    const container = document.getElementById("logContainer");

    if (logs.length > lastLogCount) {
      for (let i = lastLogCount; i < logs.length; i++) {
        const log = logs[i];

        // Updated regex to handle optional source
        const match = log.match(/^(\w*)\s*\(([\d:.]*)\)\s*(?:(.*?):)?\s*(.*)$/);
        if (!match) continue;

        let [, type = "", time = "", source = "", message = ""] = match;
        const key = type.toLowerCase();

        // Show log only if the type filter is enabled (or type is empty)
        if (type && !filters[key]) continue;

        const iconChar = iconMap[key] || "";
        const iconHTML = `<span class="icon ${key}">${iconChar}</span>${type}`;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="logs-cell">${iconHTML}</td>
          <td class="logs-cell">${time}</td>
          <td class="logs-cell">${source}</td>
          <td class="logs-cell">${message}</td>
        `;
        tbody.insertBefore(row, tbody.firstChild);
      }

      // Maintain scroll position if already at top
      if (container.scrollTop === 0) {
        container.scrollTop = 0;
      }

      lastLogCount = logs.length;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  updateLogs();
  setInterval(updateLogs, 500);
});

// Table Resize Handler
const handles = document.querySelectorAll(".logs-resize-handle");
const cols = document.querySelectorAll(".logs-table col");
handles.forEach((handle, i) => {
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startX = e.clientX,
      startW = cols[i].offsetWidth;
    const onMove = (e) =>
      (cols[i].style.width = Math.max(50, startW + e.clientX - startX) + "px");
    document.addEventListener("mousemove", onMove);
    document.addEventListener(
      "mouseup",
      () => {
        document.removeEventListener("mousemove", onMove);
      },
      { once: true }
    );
  });
});

// Filter Handlers
let filters = { info: true, error: true, debug: true, warning: true };
function toggleFilter(type) {
  filters[type] = !filters[type];
  const icon = document.getElementById(`${type}Filter`);
  icon.innerHTML = filters[type] ? "\uF28E" : "\uF292";
  icon.classList.toggle("checked", filters[type]);
  resetLogs();
}

// Tabs Toggle Handler
const tabs = {
  LogsTabButton: "LogsTab",
  WidgetsTabButton: "Widgets",
  PluginsTabButton: "Plugins",
  VersionTabButton: "Version",
};
Object.keys(tabs).forEach((buttonId) => {
  document.getElementById(buttonId).addEventListener("click", () => {
    Object.values(tabs).forEach(
      (id) => (document.getElementById(id).style.display = "none")
    );
    Object.keys(tabs).forEach((id) =>
      document.getElementById(id).classList.remove("active")
    );
    document.getElementById(tabs[buttonId]).style.display = "block";
    document.getElementById(buttonId).classList.add("active");
  });
});

/**
 *  Copy to clicpboard Menu Functions.
 */

let selectedLogRow = null;
const contextMenu = document.getElementById("logContextMenu");
const copyLogOption = document.getElementById("copyLogOption");

// Show context menu on right-click
document.getElementById("logsBody").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const row = e.target.closest("tr");
  if (row) {
    selectedLogRow = row;
    contextMenu.style.display = "block";
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
  }
});

// Copy to clipboard on click
copyLogOption.addEventListener("click", () => {
  if (selectedLogRow) {
    const text = Array.from(selectedLogRow.cells)
      .map((cell) => cell.textContent.trim())
      .join(" | ");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Log copied to clipboard");
      })
      .catch((err) => {
        console.error("Clipboard copy failed:", err);
      });
    contextMenu.style.display = "none";
  }
});

// Hide context menu on outside click
document.addEventListener("click", () => {
  contextMenu.style.display = "none";
  selectedLogRow = null;
});
