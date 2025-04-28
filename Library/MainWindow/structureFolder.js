let selectedItem = null;
let detailsPanel, actionButtons, loadButton, refreshButton, editButton;
let windowSettings, checkboxContainer, addFlexLink;
window.currentFlexSection = '';  // e.g. "Test\Test.ini"

window.addEventListener('DOMContentLoaded', () => {
  // grab elements
  detailsPanel     = document.getElementById('details-panel');
  actionButtons    = document.querySelector('.action-button-container');
  loadButton       = actionButtons.querySelector('button:first-child');
  refreshButton    = actionButtons.querySelector('button:nth-child(2)');
  editButton       = actionButtons.querySelector('button:nth-child(3)');
  windowSettings   = document.querySelector('.container-positions');
  checkboxContainer= document.querySelector('.checkbox-container');
  addFlexLink      = document.querySelector('.add-flex-info');

  // hide the add‐flex link initially
  addFlexLink.classList.add('hidden');

  // build tree + wire clicks
  renderTree(document.getElementById('folderTree'), window.deskflex.folderStructure);
  initIniClickListener();

  // start fully disabled
  hideDetails();
  disableAll();

  loadButton.addEventListener('click', () => {
    const sec = window.currentFlexSection;
    if (!sec) return;
  
    // 1) reset all options to disabled+unchecked
    checkboxContainer.querySelectorAll('.option').forEach(opt => {
      opt.classList.add('disabled');
      opt.classList.remove('checked');
    });
  
    // 2) checkbox getters (your existing code)
    const checks = [
      ['Click Through',  window.deskflex.getFlexClickthrough],
      ['Draggable',      window.deskflex.getFlexDraggable],
      ['Snap Edges',     window.deskflex.getFlexSnapEdges],
      ['Keep On Screen', window.deskflex.getFlexKeepOnScreen],
      ['Save Position',  window.deskflex.getFlexSavePosition],
      ['Favorite',       window.deskflex.getFlexFavorite],
    ];
    checks.forEach(([label, getter]) => {
      const val = getter(sec);
      const option = Array.from(checkboxContainer.querySelectorAll('.option'))
        .find(o => o.querySelector('label').textContent.trim() === label);
      if (!option) return;
  
      if (val === 1 || val === '1') {
        option.classList.remove('disabled');
        option.classList.add('checked');
      }
      else if (val === 0 || val === '0') {
        option.classList.remove('disabled');
        option.classList.remove('checked');
      }
      else {
        option.classList.add('disabled');
        option.classList.remove('checked');
      }
    });
  
    // 3) Enable the positions & inputs panel
    windowSettings.classList.remove('disabled');
    document.querySelectorAll('.coords-input, .load-order-input')
            .forEach(i => i.disabled = false);
  
    // 4) Populate Coordinates
    const x = window.deskflex.getFlexWindowX(sec);
    const y = window.deskflex.getFlexWindowY(sec);
    document.querySelector('.coords-input-x').value = x != null ? x : '';
    document.querySelector('.coords-input-y').value = y != null ? y : '';
  
    // 5) Populate Load Order
    const loadOrder = window.deskflex.getFlexLoadOrder(sec);
    document.querySelector('.load-order-input').value = loadOrder != null ? loadOrder : '';
  
    // 6) Populate Position
    const posVal = String(window.deskflex.getFlexPosition(sec));
    const posMap = {
      '2': 'Stay topmost',
      '1': 'Topmost',
      '0': 'Normal',
      '-1': 'Bottom',
      '-2': 'On Desktop'
    };
    setDropdown('position', posMap[posVal]);
  
    // 7) Populate Transparency
    const transVal = window.deskflex.getFlexTransparency(sec);
    // normalize to integer 0–100
    const pct = parseInt(transVal, 10);
    setDropdown('transparency', pct >= 0 && pct <= 100 ? `${pct}%` : 'Select…');
  
    // 8) Populate On-hover
    const hoverVal = String(window.deskflex.getFlexOnHover(sec));
    const hoverMap = {
      '0': 'Do Nothing',
      '1': 'Hide',
      '2': 'Fade in',
      '3': 'Fade out'
    };
    setDropdown('hover', hoverMap[hoverVal]);
  
    // helper to set box text + mark the matching <a> in the menu
    function setDropdown(type, label) {
      const box  = document.querySelector(`.${type}-box`);
      const menu = document.getElementById(
        type === 'position'      ? 'positionMenu'
      : type === 'transparency' ? 'transparencyMenu'
      :                            'hoverMenu'
      );
    
      // find the very first child text node and replace its text
      for (let node of box.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = label || 'Select…';
          break;
        }
      }
    
      // re-select the matching <a>
      Array.from(menu.querySelectorAll('a')).forEach(a => {
        a.classList.toggle('selected', a.textContent.trim() === label);
      });
    }
    
  });
  
});

/** DISABLE all buttons + settings + options */
function disableAll() {
  [loadButton, refreshButton, editButton].forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });
  windowSettings.classList.add('disabled');
  // disable every option individually
  checkboxContainer.querySelectorAll('.option').forEach(opt => {
    opt.classList.add('disabled');
    opt.querySelector('.check-box').textContent = '';
  });
}

/** ENABLE only Load + Edit (keep everything else off) */
function enableLoadEdit() {
  [loadButton, editButton].forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('disabled');
  });
  // Refresh stays off
  refreshButton.disabled = true;
  refreshButton.classList.add('disabled');

  windowSettings.classList.add('disabled');
  // keep each option off until Load is clicked
  checkboxContainer.querySelectorAll('.option').forEach(opt => {
    opt.classList.add('disabled');
    opt.querySelector('.check-box').textContent = '';
  });
}

/** Selection logic */
function selectItem(item) {
  if (selectedItem) selectedItem.classList.remove('selected');
  item.classList.add('selected');
  selectedItem = item;

  const name = item.querySelector('span:last-child').textContent;
  if (name.toLowerCase().endsWith('.ini')) {
    const fullPath = getFullPath(item);
    displayFlexInfo(fullPath);
    showDetails();
    enableLoadEdit();

    // show-add-flex only if no FlexInfo section
    if (!window.deskflex.hasFlexInfoSection(window.currentFlexSection)) {
      addFlexLink.classList.remove('hidden');
    } else {
      addFlexLink.classList.add('hidden');
    }
  } else {
    hideDetails();
    disableAll();
    addFlexLink.classList.add('hidden');
  }
}

/** Render folder/file tree */
function renderTree(container, obj, path = '') {
  Object.entries(obj).forEach(([name, subtree]) => {
    const item   = document.createElement('div');
    item.className = 'tree-item';
    const header = document.createElement('div');
    header.className = 'tree-node';
    const icon   = document.createElement('span');
    icon.className = 'icon';
    const label  = document.createElement('span');
    label.textContent = name;
    header.append(icon, label);
    item.append(header);

    const currentPath = path ? `${path}\\${name}` : name;
    if (subtree && typeof subtree === 'object') {
      icon.textContent = '\ue643';
      icon.classList.add('folder-icon');
      header.addEventListener('click', e => {
        e.stopPropagation();
        item.classList.toggle('open');
        icon.textContent = item.classList.contains('open') ? '\uf42e' : '\ue643';
        selectItem(item);
      });
      const children = document.createElement('div');
      children.className = 'children';
      item.append(children);
      renderTree(children, subtree, currentPath);
    } else {
      icon.textContent = '\ue269';
      icon.classList.add('file-icon');
      header.addEventListener('click', e => {
        e.stopPropagation();
        selectItem(item);
      });
    }
    container.append(item);
  });
}

/** Intercept clicks on .ini leaves */
function initIniClickListener() {
  document.getElementById('folderTree').addEventListener('click', e => {
    const header = e.target.closest('.tree-node');
    if (!header) return;
    const name = header.querySelector('span:last-child').textContent;
    if (!name.toLowerCase().endsWith('.ini')) return;
    // selectItem handles everything else
  }, true);
}

function hideDetails() { detailsPanel.classList.add('hidden'); }
function showDetails() { detailsPanel.classList.remove('hidden'); }

/** Populates the details panel and sets currentFlexSection */
function displayFlexInfo(filePath) {
  const flexInfo = window.deskflex.getFlexInfo(filePath) || {};
  document.getElementById('name').textContent        = flexInfo.Name        || 'N/A';
  document.getElementById('author').textContent      = flexInfo.Author      || 'N/A';
  document.getElementById('version').textContent     = flexInfo.Version     || 'N/A';
  document.getElementById('license').textContent     = flexInfo.License     || 'N/A';
  document.getElementById('information').textContent = flexInfo.Information || 'No additional info.';

  // build the relative flexSection = "Test\Test.ini"
  const parts    = filePath.split('\\');
  const fileName = parts.pop();
  const idxFlex  = parts.indexOf('Flexes');
  const widgetArr= idxFlex >= 0 ? parts.slice(idxFlex + 1) : parts;
  window.currentFlexSection = widgetArr.concat(fileName).join('\\');

  // update UI
  document.getElementById('main-ini').textContent = fileName;
  document.getElementById('widget').textContent   = widgetArr.join('\\') || '-';
}

/** reconstruct full absolute path */
function getFullPath(item) {
  const segs = [];
  let node = item;
  while (node) {
    segs.unshift(node.querySelector('span:last-child').textContent);
    node = node.closest('.children')?.parentElement
           .querySelector(':scope > .tree-node');
  }
  const base = (window.deskflex.flexpath || window.deskflex.flexPath || '')
               .replace(/[\/\\]+$/, '');
  return `${base}\\${segs.join('\\')}`;
}
