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

  // default section identifier from <body>
  const defaultSection = document.body.dataset.section;

  for (const act of actions) {
    const type = (act.type || "execute").toLowerCase();
    const p = act.param;

    if (type === "delay") {
      const ms = parseInt(p, 10);
      if (Number.isFinite(ms) && ms > 0) await delay(ms);
    }
    else if (type === "log") {
      log(p);
    }
    else if (type === "execute") {
      exec(p, err => {
        if (err) console.error(`Exec "${p}" failed:`, err);
      });
    }
    else if (type === "move") {
      let section, x, y;

      if (Array.isArray(p) && p.length === 3) {
        [section, x, y] = p;
      } else if (typeof p === "string") {
        const tokens = p.match(/"([^"]+)"|\S+/g)
                        .map(t => t.replace(/^"|"$/g, ""));

        if (tokens.length === 3 && !isNaN(tokens[0]) && !isNaN(tokens[1])) {
          // "100 200 sectionName"
          [x, y, section] = [
            parseInt(tokens[0], 10),
            parseInt(tokens[1], 10),
            tokens[2]
          ];
        }
        else if (tokens.length === 2 && !isNaN(tokens[0]) && !isNaN(tokens[1])) {
          // "100 200" → fallback to defaultSection
          [x, y] = [
            parseInt(tokens[0], 10),
            parseInt(tokens[1], 10)
          ];
          section = defaultSection;
        }
        else if (tokens.length === 2) {
          // "sectionName 100" or "sectionName 100 200"? unlikely—warn
          console.warn("Ambiguous move params, expected [x,y] or [x,y,section]:", p);
        }
      }

      if (!section) section = defaultSection;
      if (typeof x === "number" && typeof y === "number" && section) {
        ipcRenderer.send("widget-move-window", x, y, section);
      } else {
        console.warn("Invalid move parameters:", p);
      }
    }
    else if (type === "settransparency") {
      let percent, section;

      if (Array.isArray(p) && p.length === 2) {
        [percent, section] = p;
      } else if (typeof p === "string") {
        const parts = p.match(/"([^"]+)"|\S+/g)
                       .map(t => t.replace(/^"|"$/g, ""));
        [percent, section] = parts;
      }

      if (!section) section = defaultSection;
      if (typeof percent === "string" && section) {
        ipcRenderer.send(
          "widget-set-transparency",
          percent.replace("%", ""),
          section
        );
      } else {
        console.warn("Invalid settransparency parameters:", p);
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
    ["down", "up", "doubleclick"].forEach(evt => {
      el.addEventListener(
        evt === "doubleclick" ? "dblclick" : `mouse${evt}`,
        e => {
          const btn = buttonMap[e.button];
          if (btn) runAction(el, `${btn}mouse${evt}action`);
        }
      );
    });
    el.addEventListener("mouseover", () => runAction(el, "mouseoveraction"));
    el.addEventListener("mouseleave", () => runAction(el, "mouseleaveaction"));
    el.addEventListener("wheel", e => {
      if (e.deltaY > 0) runAction(el, "mousescrolldownaction");
      else if (e.deltaY < 0) runAction(el, "mousescrollupaction");
      if (e.deltaX > 0) runAction(el, "mousescrollrightaction");
      else if (e.deltaX < 0) runAction(el, "mousescrollleftaction");
    });
  });
}

window.addEventListener("DOMContentLoaded", wireWidgetEvents);
