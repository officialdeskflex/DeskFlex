const { exec } = require("child_process");
const { log, delay } = require("./WidgetBangs");
const { ipcRenderer } = require("electron");

const BTN = { 0: "left", 1: "middle", 2: "right", 3: "x1", 4: "x2" };

const handlers = {
  delay: async (p) => {
    const ms = parseInt(p, 10);
    if (ms > 0) await delay(ms);
  },
  log: (p) => log(p),
  execute: (p) => exec(p, (e) => e && console.error(`Exec \"${p}\" failed:`, e)),
  move: ([x, y, section], defSec) => {
    ipcRenderer.send("widget-move-window", x, y, section || defSec);
  },
  settransparency: ([percent, section], defSec) => {
    ipcRenderer.send(
      "widget-set-transparency",
      String(percent).replace("%", ""),
      section || defSec
    );
  },
  draggable: ([val, section], defSec) => {
    if (!["0", "1"].includes(String(val))) return console.warn("Invalid draggable:", val);
    ipcRenderer.send("widget-set-draggable", val, section || defSec);
  },
  keeponscreen: ([val, section], defSec) => {
    if (!["0", "1"].includes(String(val))) return console.warn("Invalid keepOnScreen:", val);
    ipcRenderer.send("widget-set-keep-on-screen", val, section || defSec);
  },
    clickthrough: ([val, section], defSec) => {
    if (!["0", "1"].includes(String(val))) {
      return console.warn("Invalid clickThrough:", val);
    }
    ipcRenderer.send(
      "widget-set-clickthrough",
      String(val),
      section || defSec
    );
  },
};

const parseParam = (p) => {
  if (Array.isArray(p)) return p;
  return String(p)
    .match(/"([^"]+)"|\S+/g)
    .map((t) => t.replace(/^"|"$/g, ""));
};

async function runAction(el, key) {
  const raw = el.dataset[key.toLowerCase()];
  if (!raw) return;

  let actions;
  try { actions = JSON.parse(raw); } 
  catch (e) { return console.error(`Invalid JSON for ${key}:`, raw, e); }

  const defSec = document.body.dataset.section;

  for (const { type = "execute", param } of actions) {
    const t = type.toLowerCase();
    if (t === "delay" || t === "log" || t === "execute") {
      await handlers[t](param);
    } else if (handlers[t]) {
      const parts = parseParam(param);
      handlers[t](parts.map((v) => (isNaN(v) ? v : parseInt(v, 10))), defSec);
    } else {
      console.warn(`Unknown action type \"${t}\"`, type);
    }
  }
}

function wireWidgetEvents() {
  document.querySelectorAll(".widget").forEach((el) => {
    el.oncontextmenu = (e) => e.preventDefault();
    ["down", "up", "doubleclick"].forEach((evt) => {
      const ev = evt === "doubleclick" ? "dblclick" : `mouse${evt}`;
      el.addEventListener(ev, (e) => {
        const btn = BTN[e.button];
        btn && runAction(el, `${btn}mouse${evt}action`);
      });
    });
    el.addEventListener("mouseover", () => runAction(el, "mouseoveraction"));
    el.addEventListener("mouseleave", () => runAction(el, "mouseleaveaction"));
    el.addEventListener("wheel", (e) => {
      const dir = e.deltaY > 0 ? "down" : e.deltaY < 0 ? "up" : e.deltaX > 0 ? "right" : "left";
      runAction(el, `mousescroll${dir}action`);
    });
  });
}

window.addEventListener("DOMContentLoaded", wireWidgetEvents);
