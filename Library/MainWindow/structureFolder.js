let selectedItem = null;
let detailsPanel, actionButtons, loadButton, refreshButton, editButton, windowSettings, checkboxContainer, addFlexLink;

window.addEventListener('DOMContentLoaded', () => {
  // grab everything
  detailsPanel     = document.getElementById('details-panel');
  actionButtons    = document.querySelector('.action-button-container');
  loadButton       = actionButtons.querySelector('button:nth-child(1)');
  refreshButton    = actionButtons.querySelector('button:nth-child(2)');
  editButton       = actionButtons.querySelector('button:nth-child(3)');
  windowSettings   = document.querySelector('.container-positions');
  checkboxContainer= document.querySelector('.checkbox-container');
  addFlexLink      = document.querySelector('.add-flex-info');

  // hide the “Add FlexInfo” link initially
  addFlexLink.classList.add('hidden');

  // build the tree
  const treeContainer = document.getElementById('folderTree');
  renderTree(treeContainer, window.deskflex.folderStructure);

  // wire up clicks
  initIniClickListener();

  // start with everything off
  hideDetails();
  disableAll();
});

/** DISABLE everything (buttons + settings + checkboxes) */
function disableAll() {
  [loadButton, refreshButton, editButton].forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });
  windowSettings.classList.add('disabled');
  checkboxContainer.classList.add('disabled');
}

/** ENABLE only Load + Edit (keep Refresh + settings + checkboxes disabled) */
function enableLoadEdit() {
  [loadButton, editButton].forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('disabled');
  });
  // Refresh stays off
  refreshButton.disabled = true;
  refreshButton.classList.add('disabled');

  // settings & checkboxes remain off
  windowSettings.classList.add('disabled');
  checkboxContainer.classList.add('disabled');
}

/** highlight selection & decide enable/disable + Add-FlexInfo logic */
function selectItem(item) {
  if (selectedItem) selectedItem.classList.remove('selected');
  item.classList.add('selected');
  selectedItem = item;

  const name = item.querySelector('span:last-child').textContent;
  if (name.toLowerCase().endsWith('.ini')) {
    const path = getFullPath(item);
    displayFlexInfo(path);
    showDetails();
    enableLoadEdit();

    // Show “Add FlexInfo” only if there's NO [FlexInfo] section
    if (!window.deskflex.hasFlexInfoSection(path)) {
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

/** render tree recursively */
function renderTree(container, obj, path = '') {
  Object.entries(obj).forEach(([name, subtree]) => {
    const item = document.createElement('div');
    item.className = 'tree-item';
    const header = document.createElement('div');
    header.className = 'tree-node';
    const icon = document.createElement('span');
    icon.className = 'icon';
    const label = document.createElement('span');
    label.textContent = name;
    header.append(icon, label);
    item.append(header);

    const currentPath = path ? `${path}\\${name}` : name;
    if (subtree && typeof subtree === 'object') {
      icon.textContent = '\ue643';
      icon.classList.add('folder-icon');
      header.addEventListener('click', e => {
        e.stopPropagation();
        const open = item.classList.toggle('open');
        icon.textContent = open ? '\uf42e' : '\ue643';
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
    // selection logic in selectItem() will handle everything else
  }, true);
}

function hideDetails()   { detailsPanel.classList.add('hidden'); }
function showDetails()   { detailsPanel.classList.remove('hidden'); }

/** fills in flex info, main-ini & widget fields */
function displayFlexInfo(filePath) {
  const flexInfo = window.deskflex.getFlexInfo(filePath) || {};
  document.getElementById('name').textContent        = flexInfo.Name        || '-';
  document.getElementById('author').textContent      = flexInfo.Author      || '-';
  document.getElementById('version').textContent     = flexInfo.Version     || '-';
  document.getElementById('license').textContent     = flexInfo.License     || '-';
  document.getElementById('information').textContent = flexInfo.Information || 'No additional information.';

  // split path
  const parts    = filePath.split('\\');
  const fileName = parts.pop();
  const flexesIx = parts.indexOf('Flexes');
  const widgetArr = flexesIx >= 0
    ? parts.slice(flexesIx + 1)
    : parts;
    
  document.getElementById('main-ini').textContent = fileName;
  document.getElementById('widget').textContent   = widgetArr.join('\\') || '-';
}

function getFullPath(item) {
  const segs = [];
  let node = item;
  while (node) {
    segs.unshift(node.querySelector('span:last-child').textContent);
    const parent = node.closest('.children')?.parentElement;
    node = parent?.querySelector(':scope > .tree-node');
  }
  const base = (window.deskflex.flexpath || window.deskflex.flexPath || '').replace(/[\/\\]+$/, '');
  return `${base}\\${segs.join('\\')}`;
}
