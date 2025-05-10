const { exec } = require("child_process");

const BTN = { 0: "left", 1: "middle", 2: "right", 3: "x1", 4: "x2" };

const handlers = {
  delay: async (ms) => {
    const parsedMs = parseInt(ms, 10);
    if (parsedMs > 0) await new Promise(resolve => setTimeout(resolve, parsedMs));
  },
  log: (msg) => console.log(msg),
  execute: (cmd) => {
    exec(cmd, (error) => error && console.error(`Exec "${cmd}" failed:`, error));
  },
  move: ([x, y, section], defaultSection) => {
    ipcRenderer.send("widget-move-window", x, y, section || defaultSection);
  },
  settransparency: ([percent, section], defSec) => {
  const value = String(percent).replace("%", "");
  const targetSection = section || defSec;
  ipcRenderer.send("widget-set-transparency", value, targetSection);
  },
  draggable: ([val, section], defSec) => {
    if (!["0", "1"].includes(String(val)))
      return console.warn("Invalid draggable:", val);
    ipcRenderer.send("widget-set-draggable", val, section || defSec);
  },
  keeponscreen: ([val, section], defSec) => {
    if (!["0", "1"].includes(String(val)))
      return console.warn("Invalid keepOnScreen:", val);
    ipcRenderer.send("widget-set-keep-on-screen", val, section || defSec);
  },
  clickthrough: ([val, section], defSec) => {
    if (!["0", "1"].includes(String(val))) {
      return console.warn("Invalid clickThrough:", val);
    }
    ipcRenderer.send("widget-set-clickthrough", String(val), section || defSec);
  },
  toggledraggable: async ([section], defSec) => {
    const sec = section && section.trim() ? section : defSec;
    const current = await ipcRenderer.invoke("widget-get-draggable", sec);
    const newVal = current ? 0 : 1;
    ipcRenderer.send("widget-set-draggable", String(newVal), sec);
  },
  togglekeeponscreen: async ([section], defSec) => {
    const sec = section && section.trim() ? section : defSec;
    const current = await ipcRenderer.invoke("widget-get-keep-on-screen", sec);
    const newVal = current ? 0 : 1;
    ipcRenderer.send("widget-set-keep-on-screen", String(newVal), sec);
  },
  toggleclickthrough: async ([section], defSec) => {
    const sec = section && section.trim() ? section : defSec;
    const current = await ipcRenderer.invoke("widget-get-clickthrough", sec);
    const newVal = current ? 0 : 1;
    ipcRenderer.send("widget-set-clickthrough", String(newVal), sec);
  },
  loadwidget: async ([section], defSec) => {
    const sec = section && section.trim() ? section : defSec;
    await ipcRenderer.invoke("widget-load-widget", sec);
  },

  unloadwidget: async ([section], defSec) => {
    const sec = section && section.trim() ? section : defSec;
    await ipcRenderer.invoke("widget-unload-widget", sec);
  },

  togglewidget: async ([section], defSec) => {
    const sec = section && section.trim() ? section : defSec;
    await ipcRenderer.invoke("widget-toggle-widget", sec);
  },
};

const parseParam = (p) => {
  if (p == null) return [];
  return Array.isArray(p) ? p : (String(p).match(/"([^"]+)"|\S+/g) || []).map(t => t.replace(/^"|"$/g, ""));
};

async function runAction(el, key) {
  const raw = el.dataset[key.toLowerCase()];
  if (!raw) return;

  let actions;
  try {
    actions = JSON.parse(raw);
  } catch (e) {
    return console.error(`Invalid JSON for ${key}:`, raw, e);
  }

  const defSec = document.body.dataset.section;

  for (const { type = "execute", param } of actions) {
    const lowerType = type.toLowerCase();
    if (["delay", "log", "execute"].includes(lowerType)) {
      await widgetUtils[lowerType](param);
    } else if (widgetUtils[lowerType]) {
      const parts = parseParam(param);
      widgetUtils[lowerType](parts.map(v => (isNaN(v) ? v : parseInt(v, 10))), defSec);
    } else {
      console.warn(`Unknown action type "${lowerType}"`, type);
    }
  }
}

function wireWidgetEvents() {
  document.querySelectorAll(".widget").forEach((widgetElement) => {
    widgetElement.oncontextmenu = (event) => event.preventDefault();

    ["down", "up", "doubleclick"].forEach((evt) => {
      const mouseEvent = evt === "doubleclick" ? "dblclick" : `mouse${evt}`;
      widgetElement.addEventListener(mouseEvent, (event) => {
        const button = BTN[event.button];
        if (button) {
          runAction(widgetElement, `${button}mouse${evt}action`);
        }
      });
    });

    widgetElement.addEventListener("mouseover", () => runAction(widgetElement, "mouseoveraction"));
    widgetElement.addEventListener("mouseleave", () => runAction(widgetElement, "mouseleaveaction"));
    widgetElement.addEventListener("wheel", (event) => {
      let direction;
      if (event.deltaY > 0) {
        direction = "down";
      } else if (event.deltaY < 0) {
        direction = "up";
      } else if (event.deltaX > 0) {
        direction = "right";
      } else {
        direction = "left";
      }
      runAction(widgetElement, `mousescroll${direction}action`);
    });
  });
}

window.addEventListener("DOMContentLoaded", wireWidgetEvents);