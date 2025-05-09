// WidgetActions.js
const { exec } = require("child_process");
const { log, delay } = require("./WidgetBangs");
const { ipcRenderer } = require("electron");

const buttonMap = { 0: "left", 1: "middle", 2: "right", 3: "x1", 4: "x2" };

async function runAction(el, keyName) {
  const raw = el.dataset[keyName.toLowerCase()];
  if (!raw) return;
  let actions;
  try {
    actions = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid action JSON for ${keyName}:`, raw, e);
    return;
  }

  const defaultSection = document.body.dataset.section;

  for (const act of actions) {
    const type = (act.type || "execute").toLowerCase();
    const p    = act.param;

    if (type === "delay") {
      const ms = parseInt(p, 10);
      if (Number.isFinite(ms) && ms > 0) await delay(ms);
    }
    else if (type === "log") {
      log(p);
    }
    else if (type === "execute") {
      exec(p, err => { if (err) console.error(`Exec "${p}" failed:`, err); });
    }
    else if (type === "move") {
      // existing move logic...
      let section, x, y;
      // parse p into [x,y,section]...
      // then call:
      ipcRenderer.send("widget-move-window", x, y, section || defaultSection);
    }
    else if (type === "settransparency") {
      // existing...
      ipcRenderer.send("widget-set-transparency", paramVal, section);
    }
    else if (type === "draggable") {
      // new bang: toggle draggable at runtime
      let val, section;
      if (Array.isArray(p)) [val, section] = p;
      else {
        const parts = p.match(/"([^"]+)"|\S+/g).map(t => t.replace(/^"|"$/g,""));
        [val, section] = parts;
      }
      section = section || defaultSection;
      if (["0","1"].includes(val.toString())) {
        ipcRenderer.send("widget-set-draggable", val, section);
      } else {
        console.warn("Invalid draggable parameters:", p);
      }
    }
    else if (type === "keeponscreen") {
      // new bang: toggle keep‑on‑screen at runtime
      let val, section;
      if (Array.isArray(p)) [val, section] = p;
      else {
        const parts = p.match(/"([^"]+)"|\S+/g).map(t => t.replace(/^"|"$/g,""));
        [val, section] = parts;
      }
      section = section || defaultSection;
      if (["0","1"].includes(val.toString())) {
        ipcRenderer.send("widget-set-keep-on-screen", val, section);
      } else {
        console.warn("Invalid keepOnScreen parameters:", p);
      }
    }
    else {
      console.warn(`Unknown action type "${type}"`, act);
    }
  }
}

function wireWidgetEvents() {
  document.querySelectorAll(".widget").forEach(el => {
    el.addEventListener("contextmenu", e => e.preventDefault());
    ["down","up","doubleclick"].forEach(evt => {
      el.addEventListener(
        evt === "doubleclick" ? "dblclick" : `mouse${evt}`,
        e => {
          const btn = buttonMap[e.button];
          if (btn) runAction(el, `${btn}mouse${evt}action`);
        }
      );
    });
    el.addEventListener("mouseover",  () => runAction(el, "mouseoveraction"));
    el.addEventListener("mouseleave", () => runAction(el, "mouseleaveaction"));
    el.addEventListener("wheel", e => {
      if (e.deltaY > 0) runAction(el, "mousescrolldownaction");
      if (e.deltaY < 0) runAction(el, "mousescrollupaction");
      if (e.deltaX > 0) runAction(el, "mousescrollrightaction");
      if (e.deltaX < 0) runAction(el, "mousescrollleftaction");
    });
  });
}

window.addEventListener("DOMContentLoaded", wireWidgetEvents);
