//WidgetActions.js
const { exec } = require("child_process");
const { ipcRenderer } = require("electron");
const { log, delay } = require("./WidgetBangs");

const BTN = { 0: "left", 1: "middle", 2: "right", 3: "x1", 4: "x2" };

const widgetUtils = {
  delay: async (ms) => {
  const parsedMs = parseInt(ms, 10);
  if (parsedMs > 0) await delay(parsedMs);
  },
  log: (msg) => log(msg),
  execute: (cmd) => {
    exec(cmd, (error) => error && console.error(`Exec "${cmd}" failed:`, error));
  },
  move: ([x, y, widgetName], curWidgetName) => {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    log(`Invalid coordinates: x=${x}, y=${y}`, "error", widgetName || curWidgetName);
    return;
  }
    ipcRenderer.send("widget-move-window", x, y, widgetName || curWidgetName);
  },
  settransparency: ([percent, widgetName], currentWidgetName) => {
    const value = String(percent).replace("%", "");
    const targetwidgetName = widgetName || currentWidgetName;
    ipcRenderer.send("widget-set-transparency", value, targetwidgetName);
  },
  draggable: ([val, widgetName], currentWidgetName) => {
  if (!["0", "1"].includes(String(val))) {
    log(`Invalid draggable value: ${val}. Expected "0" or "1".`, "error", currentWidgetName || currentWidgetName);
  } else {
    ipcRenderer.send("widget-set-draggable", val, widgetName || currentWidgetName);
  }
  },
  keeponscreen: ([val, widgetName], currentWidgetName) => {
  if (!["0", "1"].includes(String(val))) {
    log(`Invalid keepOnScreen value: ${val}. Expected "0" or "1".`, "error", widgetName || currentWidgetName);
  } else {
    ipcRenderer.send("widget-set-keep-on-screen", val, widgetName || currentWidgetName);
  }
  },
  clickthrough: ([val, widgetName], currentWidgetName) => {
  if (!["0", "1"].includes(String(val))) {
    log(`Invalid clickThrough value: ${val}. Expected "0" or "1".`, "error", widgetName || currentWidgetName);
  } else {
    ipcRenderer.send("widget-set-clickthrough", String(val), widgetName || currentWidgetName);
  }
  },
  toggledraggable: async ([widgetName], currentWidgetName) => {
    const sec = widgetName && widgetName.trim() ? widgetName : currentWidgetName;
    const current = await ipcRenderer.invoke("widget-get-draggable", sec);
    const newVal = current ? 0 : 1;
    ipcRenderer.send("widget-set-draggable", String(newVal), sec);
  },
  togglekeeponscreen: async ([widgetName], currentWidgetName) => {
    const sec = widgetName && widgetName.trim() ? widgetName : currentWidgetName;
    const current = await ipcRenderer.invoke("widget-get-keep-on-screen", sec);
    const newVal = current ? 0 : 1;
    ipcRenderer.send("widget-set-keep-on-screen", String(newVal), sec);
  },
  toggleclickthrough: async ([widgetName], currentWidgetName) => {
    const sec = widgetName && widgetName.trim() ? widgetName : currentWidgetName;
    const current = await ipcRenderer.invoke("widget-get-clickthrough", sec);
    const newVal = current ? 0 : 1;
    ipcRenderer.send("widget-set-clickthrough", String(newVal), sec);
  },
  loadwidget: async ([widgetName], currentWidgetName) => {
    const sec = widgetName && widgetName.trim() ? widgetName : currentWidgetName;
    await ipcRenderer.invoke("widget-load-widget", sec);
  },
  unloadwidget: async ([widgetName], currentWidgetName) => {
    const sec = widgetName && widgetName.trim() ? widgetName : currentWidgetName;
    await ipcRenderer.invoke("widget-unload-widget", sec);
  },
  togglewidget: async ([widgetName], currentWidgetName) => {
    const sec = widgetName && widgetName.trim() ? widgetName : currentWidgetName;
    await ipcRenderer.invoke("widget-toggle-widget", sec);
  }
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

  const currentWidgetName = document.body.dataset.widgetName;

  for (const { type = "execute", param } of actions) {
    const lowerType = type.toLowerCase();
    if (["delay", "log", "execute"].includes(lowerType)) {
      await widgetUtils[lowerType](param);
    } else if (widgetUtils[lowerType]) {
      const parts = parseParam(param);
      widgetUtils[lowerType](parts.map(v => (isNaN(v) ? v : parseInt(v, 10))), currentWidgetName);
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