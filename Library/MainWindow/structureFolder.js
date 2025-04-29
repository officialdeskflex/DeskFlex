let selectedItem = null;
let detailsPanel, actionButtons, loadButton, refreshButton, editButton;
let windowSettings, checkboxContainer, addFlexLink;
window.currentFlexSection = '';
window.currentFlexFilePath = '';

window.addEventListener('DOMContentLoaded', () => {
  // Grab UI elements
  detailsPanel      = document.getElementById('details-panel');
  actionButtons     = document.querySelector('.action-button-container');
  loadButton        = actionButtons.querySelector('button:first-child');
  refreshButton     = actionButtons.querySelector('button:nth-child(2)');
  editButton        = actionButtons.querySelector('button:nth-child(3)');
  windowSettings    = document.querySelector('.container-positions');
  checkboxContainer = document.querySelector('.checkbox-container');
  addFlexLink       = document.querySelector('.add-flex-info');

  // Initial UI state
  addFlexLink.classList.add('hidden');
  windowSettings.style.opacity    = '0.5';
  checkboxContainer.style.opacity = '0.5';
  hideDetails();
  disableAll();

  // Build folder tree and wire INI clicks
  renderTree(document.getElementById('folderTree'), window.deskflex.folderStructure);
  initIniClickListener();

  // Load / Unload button
  loadButton.addEventListener('click', onLoadUnload);

  // Edit button opens the .ini in config settings
  editButton.addEventListener('click', () => {
    if (window.currentFlexFilePath) {
      window.deskflex.openConfigSettings(window.currentFlexFilePath);
    }
  });

  // Active-Flex dropdown toggle
  const openBtn = document.getElementById('toggle-Dropdown');
  if (openBtn) {
    openBtn.addEventListener('click', e => {
      e.stopPropagation(); 
      toggleDropdown();
    });
  }

  // Close dropdown on outside click
  window.addEventListener('click', closeDropdownOnClickOutside);

  // Populate Active-Flex list
  populateDropdown();

  // Wire any custom dropdowns (data-target)
  document.querySelectorAll('[data-target]').forEach(box => {
    const menu = document.getElementById(box.dataset.target);
    box.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle('show');
      box.classList.toggle('open', isOpen);
      if (isOpen) {
        requestAnimationFrame(() => {
          const rect = menu.getBoundingClientRect();
          menu.classList.toggle('dropup', rect.bottom > window.innerHeight);
        });
      } else {
        menu.classList.remove('dropup');
      }
    });
    document.addEventListener('click', e => {
      if (!box.contains(e.target) && menu.classList.contains('show')) {
        menu.classList.remove('show');
        box.classList.remove('open');
        menu.classList.remove('dropup');
      }
    });
  });
});

// Load / Unload widget handler
function onLoadUnload() {
  const sec = window.currentFlexSection;
  if (!sec) return;
  const isLoadMode = loadButton.textContent.trim().toLowerCase() === 'load';

  window.deskflex[isLoadMode ? 'loadWidget' : 'unloadWidget'](sec)
    .then(() => window.deskflex.setActiveValue(sec, isLoadMode ? 1 : 0))
    .then(() => {
      if (isLoadMode) {
        loadButton.textContent = 'Unload';
        refreshButton.disabled = false;
        refreshButton.classList.remove('disabled');
        windowSettings.style.opacity    = '1';
        checkboxContainer.style.opacity = '1';
        resetOptions();
        updateSettingsPanel(sec);
      } else {
        enableLoadEdit();
        windowSettings.style.opacity    = '0.5';
        checkboxContainer.style.opacity = '0.5';
      }
    })
    .catch(err => console.error(`Failed to ${isLoadMode ? 'load' : 'unload'} widget:`, err));
}

// Handle selection from Active-Flex dropdown
function handleActiveFlexSelection(sec) {
  const base = (window.deskflex.flexpath || window.deskflex.flexPath || '').replace(/[\/\\]+$/, '');
  const fullPath = `${base}\\${sec}`;
  window.currentFlexSection  = sec;
  window.currentFlexFilePath = fullPath;

  // Mirror .ini select logic:
  displayFlexInfo(fullPath);
  showDetails();
  enableLoadEdit();

  const statusVal = window.deskflex.getFlexStatus(sec);
  const isActive  = statusVal === 1 || statusVal === '1';
  if (isActive) {
    loadButton.textContent = 'Unload';
    refreshButton.disabled = false;
    refreshButton.classList.remove('disabled');
    windowSettings.style.opacity    = '1';
    checkboxContainer.style.opacity = '1';
    resetOptions();
    updateSettingsPanel(sec);
  } else {
    loadButton.textContent = 'Load';
    refreshButton.disabled = true;
    refreshButton.classList.add('disabled');
    windowSettings.style.opacity    = '0.5';
    checkboxContainer.style.opacity = '0.5';
  }

  if (!window.deskflex.hasFlexInfoSection(sec)) {
    addFlexLink.classList.remove('hidden');
  } else {
    addFlexLink.classList.add('hidden');
  }
}

// Reset all checkbox options to unchecked & disabled
function resetOptions() {
  checkboxContainer.querySelectorAll('.option').forEach(opt => {
    opt.classList.add('disabled');
    opt.classList.remove('checked');
  });
}

// Disable all controls
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

// Enable load & edit only
function enableLoadEdit() {
  loadButton.textContent = 'Load';
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

// Tree item click handler
function selectItem(item) {
  if (selectedItem) selectedItem.classList.remove('selected');
  item.classList.add('selected');
  selectedItem = item;

  const name = item.querySelector('span:last-child').textContent;
  if (name.toLowerCase().endsWith('.ini')) {
    const fullPath = getFullPath(item);
    window.currentFlexFilePath = fullPath;
    displayFlexInfo(fullPath);
    showDetails();
    enableLoadEdit();

    const sec       = window.currentFlexSection;
    const statusVal = window.deskflex.getFlexStatus(sec);
    const isActive  = statusVal === 1 || statusVal === '1';
    if (isActive) {
      loadButton.textContent = 'Unload';
      refreshButton.disabled = false;
      refreshButton.classList.remove('disabled');
      windowSettings.style.opacity    = '1';
      checkboxContainer.style.opacity = '1';
      resetOptions();
      updateSettingsPanel(sec);
    } else {
      loadButton.textContent = 'Load';
      refreshButton.disabled = true;
      refreshButton.classList.add('disabled');
      windowSettings.style.opacity    = '0.5';
      checkboxContainer.style.opacity = '0.5';
    }

    if (!window.deskflex.hasFlexInfoSection(sec)) {
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

// Recursively render folder/INI tree
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

    if (subtree && typeof subtree === 'object') {
      icon.textContent = '\ue643'; // closed folder
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
      renderTree(children, subtree, path ? `${path}\\${name}` : name);
    } else {
      icon.textContent = '\ue269'; // file icon
      icon.classList.add('file-icon');
      header.addEventListener('click', e => {
        e.stopPropagation();
        selectItem(item);
      });
    }
    container.append(item);
  });
}

// Listen for clicks deeper in the tree
function initIniClickListener() {
  document.getElementById('folderTree').addEventListener('click', e => {
    const header = e.target.closest('.tree-node');
    if (!header) return;
    const name = header.querySelector('span:last-child').textContent;
    if (!name.toLowerCase().endsWith('.ini')) return;
  }, true);
}

function hideDetails() {
  detailsPanel.classList.add('hidden');
}
function showDetails() {
  detailsPanel.classList.remove('hidden');
}

// Display metadata from the INI
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
  const widgetArr = idxFlex >= 0 ? parts.slice(idxFlex + 1) : parts;

  window.currentFlexSection = widgetArr.concat(fileName).join('\\');
  document.getElementById('main-ini').textContent = fileName;
  document.getElementById('widget').textContent   = widgetArr.join('\\') || '-';
}

// Compute full path from tree item
function getFullPath(item) {
  const segs = [];
  let node = item;
  while (node) {
    segs.unshift(node.querySelector('span:last-child').textContent);
    node = node.closest('.children')?.parentElement.querySelector(':scope > .tree-node');
  }
  const base = (window.deskflex.flexpath || window.deskflex.flexPath || '').replace(/[\/\\]+$/, '');
  return `${base}\\${segs.join('\\')}`;
}

// Populate & wire Active-Flex dropdown
function populateDropdown() {
  const dropdown = document.getElementById("myDropdown");
  dropdown.innerHTML = "";
  if (Array.isArray(window.deskflex.activeFlex) && window.deskflex.activeFlex.length) {
    window.deskflex.activeFlex.forEach(sec => {
      const option = document.createElement("a");
      option.href = "#";
      option.textContent = sec;
      option.addEventListener('click', e => {
        e.preventDefault();
        handleActiveFlexSelection(sec);
      });
      dropdown.appendChild(option);
    });
  } else {
    const noItem = document.createElement("a");
    noItem.href = "#";
    noItem.textContent = "No Active Flex";
    noItem.style.pointerEvents = "none";
    noItem.style.opacity = "0.6";
    dropdown.appendChild(noItem);
  }
}

// Toggle the Active-Flex dropdown
function toggleDropdown() {
  const dropdown  = document.getElementById("myDropdown");
  const rectangle = document.querySelector('.rectangleActiveList');
  dropdown.classList.toggle("show");
  rectangle.classList.toggle("open");
}

// Close it when clicking elsewhere
function closeDropdownOnClickOutside(event) {
  const dropdown  = document.getElementById("myDropdown");
  const rectangle = document.querySelector('.rectangleActiveList');
  if (!rectangle.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove('show');
    rectangle.classList.remove('open');
  }
}

// Update the settings panel (checkboxes, inputs, dropdowns)
function updateSettingsPanel(sec) {
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
    option.classList.toggle('disabled', !(val === 1 || val === '1'));
    option.classList.toggle('checked',  val === 1 || val === '1');
  });

  windowSettings.classList.remove('disabled');
  document.querySelectorAll('.coords-input, .load-order-input')
    .forEach(i => i.disabled = false);

  document.querySelector('.coords-input-x').value = window.deskflex.getFlexWindowX(sec) || '';
  document.querySelector('.coords-input-y').value = window.deskflex.getFlexWindowY(sec) || '';
  document.querySelector('.load-order-input').value = window.deskflex.getFlexLoadOrder(sec) || '';

  // Dropdown mappings
  const posMap = { '2':'Stay topmost','1':'Topmost','0':'Normal','-1':'Bottom','-2':'On Desktop' };
  const hoverMap = { '0':'Do Nothing','1':'Hide','2':'Fade in','3':'Fade out' };
  setDropdown('position',   posMap[String(window.deskflex.getFlexPosition(sec))]   );
  setDropdown('transparency', (pct => pct>=0&&pct<=100?`${pct}%`:'Select…')
    (parseInt(window.deskflex.getFlexTransparency(sec),10)) );
  setDropdown('hover',       hoverMap[String(window.deskflex.getFlexOnHover(sec))]   );

  function setDropdown(type, label) {
    const box  = document.querySelector(`.${type}-box`);
    const menu = document.getElementById(
      type==='position'?'positionMenu'
      :type==='transparency'?'transparencyMenu'
      :'hoverMenu'
    );
    for (let node of box.childNodes) {
      if (node.nodeType===Node.TEXT_NODE) {
        node.textContent = label || 'Select…';
        break;
      }
    }
    Array.from(menu.querySelectorAll('a'))
      .forEach(a => a.classList.toggle('selected', a.textContent.trim() === label));
  }
}
