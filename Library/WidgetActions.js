// widgetActions.js
const { exec } = require('child_process');

const buttonMap = {
  0: 'left',
  1: 'middle',
  2: 'right',
  3: 'x1',
  4: 'x2'
};

function log(msg) {
  console.log(msg);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAction(el, keyName) {
  const data = el.dataset[keyName.toLowerCase()];
  if (!data) return;

  let actions;
  try {
    actions = JSON.parse(data);
  } catch (e) {
    console.error('Invalid action JSON for', keyName, e);
    return;
  }

  console.log(`runAction[${keyName}]:`, actions);

  for (const act of actions) {
    const type = (act.type || 'execute').toLowerCase();
    const p    = act.param;

    if (type === 'delay') {
      const ms = parseInt(p, 10);
      if (Number.isFinite(ms) && ms > 0) {
        await delay(ms);
      }
    }
    else if (type === 'log' || type === 'logs') {
      log(p);
    }
    else if (type === 'execute') {
      exec(p, err => {
        if (err) console.error(`Exec failed (${p}):`, err);
      });
    }
    else {
      console.warn(`Unknown action type "${type}"`, act);
    }
  }
}

function wireWidgetEvents() {
  document.querySelectorAll('.widget').forEach(el => {
    el.addEventListener('contextmenu', e => e.preventDefault());

    ['down', 'up', 'doubleclick'].forEach(evt => {
      el.addEventListener(
        evt === 'doubleclick' ? 'dblclick' : `mouse${evt}`,
        e => {
          const btn = buttonMap[e.button];
          if (btn) runAction(el, `${btn}mouse${evt}action`);
        }
      );
    });

    el.addEventListener('mouseover',  () => runAction(el, 'mouseoveraction'));
    el.addEventListener('mouseleave', () => runAction(el, 'mouseleaveaction'));

    el.addEventListener('wheel', e => {
      if (e.deltaY > 0) runAction(el, 'mousescrolldownaction');
      else if (e.deltaY < 0) runAction(el, 'mousescrollupaction');
      if (e.deltaX > 0) runAction(el, 'mousescrollrightaction');
      else if (e.deltaX < 0) runAction(el, 'mousescrollleftaction');
    });
  });
}

window.addEventListener('DOMContentLoaded', wireWidgetEvents);
