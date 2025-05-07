// WidgetActions.js
const { exec } = require("child_process");
const { log, delay, moveWidgetWindow } = require("./WidgetBangs");
const { ipcRenderer } = require("electron");

const buttonMap = { 0:"left",1:"middle",2:"right",3:"x1",4:"x2" };

async function runAction(el, keyName) {
  const raw = el.dataset[keyName.toLowerCase()];
  if (!raw) return;
  let actions;
  try { actions = JSON.parse(raw); } 
  catch (e) { console.error("Invalid action JSON", keyName, e); return; }

  for (const act of actions) {
    const type = (act.type||"execute").toLowerCase();
    const p = act.param;

    if (type==="delay") {
      const ms = parseInt(p,10);
      if (Number.isFinite(ms) && ms>0) await delay(ms);
    }
    else if (type==="log") log(p);
    else if (type==="execute") exec(p, err=> { if(err) console.error(`Exec "${p}" failed:`,err); });
    else if (type==="move") {
      let tokens = Array.isArray(p) ? p.map(String) 
        : p.match(/"([^"]+)"|\S+/g).map(t=>t.replace(/^"|"$/g,""));
      let section, x, y;
      if (!isNaN(tokens[0]) && !isNaN(tokens[1]) && isNaN(tokens[2])) {
        x=parseInt(tokens[0],10); y=parseInt(tokens[1],10); section=tokens[2];
      } else {
        section=tokens[0]; x=parseInt(tokens[1],10); y=parseInt(tokens[2],10);
      }
      ipcRenderer.send("widget-move-window", x, y, section);
    }
    else console.warn(`Unknown action type "${type}"`, act);
  }
}

function wireWidgetEvents() {
  document.querySelectorAll(".widget").forEach(el=>{
    el.addEventListener("contextmenu", e=>e.preventDefault());
    ["down","up","doubleclick"].forEach(evt=>{
      el.addEventListener(evt==="doubleclick"?"dblclick":`mouse${evt}`, e=>{
        const btn = buttonMap[e.button];
        if (btn) runAction(el, `${btn}mouse${evt}action`);
      });
    });
    el.addEventListener("mouseover", ()=> runAction(el, "mouseoveraction"));
    el.addEventListener("mouseleave", ()=> runAction(el, "mouseleaveaction"));
    el.addEventListener("wheel", e=>{
      if (e.deltaY>0) runAction(el,"mousescrolldownaction");
      else if (e.deltaY<0) runAction(el,"mousescrollupaction");
      if (e.deltaX>0) runAction(el,"mousescrollrightaction");
      else if (e.deltaX<0) runAction(el,"mousescrollleftaction");
    });
  });
}

window.addEventListener("DOMContentLoaded", wireWidgetEvents);
