let selectedItem = null;
let detailsPanel, actionButtons, loadButton, refreshButton, editButton;
let windowSettings, checkboxContainer, addFlexLink;
window.currentFlexSection = '';

window.addEventListener('DOMContentLoaded', () => {
  detailsPanel     = document.getElementById('details-panel');
  actionButtons    = document.querySelector('.action-button-container');
  loadButton       = actionButtons.querySelector('button:first-child');
  refreshButton    = actionButtons.querySelector('button:nth-child(2)');
  editButton       = actionButtons.querySelector('button:nth-child(3)');
  windowSettings   = document.querySelector('.container-positions');
  checkboxContainer= document.querySelector('.checkbox-container');
  addFlexLink      = document.querySelector('.add-flex-info');

  addFlexLink.classList.add('hidden');

  renderTree(document.getElementById('folderTree'), window.deskflex.folderStructure);
  initIniClickListener();

  hideDetails();
  disableAll();

  loadButton.addEventListener('click', async () => {
    const sec = window.currentFlexSection;
    if (!sec) return;
    const isLoadMode = loadButton.textContent.trim().toLowerCase() === 'load';

  try {
    if (isLoadMode) {
      await window.deskflex.loadWidget(sec);
      loadButton.textContent = 'Unload';
      refreshButton.disabled = false;
      refreshButton.classList.remove('disabled');
    } else {
      await window.deskflex.unloadWidget(sec);
      loadButton.textContent = 'Load';
      refreshButton.disabled = true;
      refreshButton.classList.add('disabled');
    }
  } catch (err) {
    console.error(`Failed to ${isLoadMode ? 'load' : 'unload'} widget:`, err);
    return;
  }
    checkboxContainer.querySelectorAll('.option').forEach(opt => {
      opt.classList.add('disabled');
      opt.classList.remove('checked');
    });
  
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
  
    windowSettings.classList.remove('disabled');
    document.querySelectorAll('.coords-input, .load-order-input')
            .forEach(i => i.disabled = false);
  
    const x = window.deskflex.getFlexWindowX(sec);
    const y = window.deskflex.getFlexWindowY(sec);
    document.querySelector('.coords-input-x').value = x != null ? x : '';
    document.querySelector('.coords-input-y').value = y != null ? y : '';
  
    const loadOrder = window.deskflex.getFlexLoadOrder(sec);
    document.querySelector('.load-order-input').value = loadOrder != null ? loadOrder : '';
  
    const posVal = String(window.deskflex.getFlexPosition(sec));
    const posMap = {
      '2': 'Stay topmost',
      '1': 'Topmost',
      '0': 'Normal',
      '-1': 'Bottom',
      '-2': 'On Desktop'
    };
    setDropdown('position', posMap[posVal]);
  
    const transVal = window.deskflex.getFlexTransparency(sec);
    const pct = parseInt(transVal, 10);
    setDropdown('transparency', pct >= 0 && pct <= 100 ? `${pct}%` : 'Select…');
  
    const hoverVal = String(window.deskflex.getFlexOnHover(sec));
    const hoverMap = {
      '0': 'Do Nothing',
      '1': 'Hide',
      '2': 'Fade in',
      '3': 'Fade out'
    };
    setDropdown('hover', hoverMap[hoverVal]);
  
    function setDropdown(type, label) {
      const box  = document.querySelector(`.${type}-box`);
      const menu = document.getElementById(
        type === 'position'      ? 'positionMenu'
      : type === 'transparency' ? 'transparencyMenu'
      :                            'hoverMenu'
      );
    
      for (let node of box.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = label || 'Select…';
          break;
        }
      }
    
      Array.from(menu.querySelectorAll('a')).forEach(a => {
        a.classList.toggle('selected', a.textContent.trim() === label);
      });
    }
    
  });
  
});

function disableAll() {
  [loadButton, refreshButton, editButton].forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });
  windowSettings.classList.add('disabled');
  checkboxContainer.querySelectorAll('.option').forEach(opt => {
    opt.classList.add('disabled');
    opt.querySelector('.check-box').textContent = '';
  });
}

function enableLoadEdit() {
  [loadButton, editButton].forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('disabled');
  });
  refreshButton.disabled = true;
  refreshButton.classList.add('disabled');

  windowSettings.classList.add('disabled');
  checkboxContainer.querySelectorAll('.option').forEach(opt => {
    opt.classList.add('disabled');
    opt.querySelector('.check-box').textContent = '';
  });
}

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

function initIniClickListener() {
  document.getElementById('folderTree').addEventListener('click', e => {
    const header = e.target.closest('.tree-node');
    if (!header) return;
    const name = header.querySelector('span:last-child').textContent;
    if (!name.toLowerCase().endsWith('.ini')) return;
  }, true);
}

function hideDetails() { detailsPanel.classList.add('hidden'); }
function showDetails() { detailsPanel.classList.remove('hidden'); }

function displayFlexInfo(filePath) {
  const flexInfo = window.deskflex.getFlexInfo(filePath) || {};
  document.getElementById('name').textContent        = flexInfo.Name        || '-';
  document.getElementById('author').textContent      = flexInfo.Author      || '-';
  document.getElementById('version').textContent     = flexInfo.Version     || '-';
  document.getElementById('license').textContent     = flexInfo.License     || '-';
  document.getElementById('information').textContent = flexInfo.Information || 'No additional info.';
  const parts    = filePath.split('\\');
  const fileName = parts.pop();
  const idxFlex  = parts.indexOf('Flexes');
  const widgetArr= idxFlex >= 0 ? parts.slice(idxFlex + 1) : parts;
  window.currentFlexSection = widgetArr.concat(fileName).join('\\');
  document.getElementById('main-ini').textContent = fileName;
  document.getElementById('widget').textContent   = widgetArr.join('\\') || '-';
}

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
