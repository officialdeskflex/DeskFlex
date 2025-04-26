// widgetActions.js
const { exec } = require('child_process');

const buttonMap = {
  0: 'Left',
  1: 'Middle',
  2: 'Right',
  3: 'X1',
  4: 'X2'
};

function runAction(el, key) {
  const data = el.dataset[key.toLowerCase()];
  if (!data) return;
  try {
    JSON.parse(data).forEach(cmd => exec(cmd));
  } catch (e) {
    console.error('Invalid action list for', key, e);
  }
}

function wireWidgetEvents() {
  document.querySelectorAll('.widget').forEach(el => {
    // disable default context menu
    el.addEventListener('contextmenu', e => e.preventDefault());

    // mouse down/up
    el.addEventListener('mousedown', e => {
      const btn = buttonMap[e.button];
      if (btn) runAction(el, btn + 'MouseDownAction');
    });
    el.addEventListener('mouseup',   e => {
      const btn = buttonMap[e.button];
      if (btn) runAction(el, btn + 'MouseUpAction');
    });

    // double-click
    el.addEventListener('dblclick', e => {
      const btn = buttonMap[e.button];
      if (btn) runAction(el, btn + 'MouseDoubleClickAction');
    });

    // hover
    el.addEventListener('mouseover',  () => runAction(el, 'MouseOverAction'));
    el.addEventListener('mouseleave', () => runAction(el, 'MouseLeaveAction'));

    // scroll
    el.addEventListener('wheel', e => {
      if (e.deltaY > 0) runAction(el, 'MouseScrollDownAction');
      else if (e.deltaY < 0) runAction(el, 'MouseScrollUpAction');
      if (e.deltaX > 0) runAction(el, 'MouseScrollRightAction');
      else if (e.deltaX < 0) runAction(el, 'MouseScrollLeftAction');
    });
  });
}

window.addEventListener('DOMContentLoaded', wireWidgetEvents);
