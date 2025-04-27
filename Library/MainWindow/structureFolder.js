let selectedItem = null;
const detailsPanel = document.getElementById('details-panel');

function selectItem(item) {
  if (selectedItem) selectedItem.classList.remove('selected');
  item.classList.add('selected');
  selectedItem = item;
}

function renderTree(container, obj, path = '') {
  Object.entries(obj).forEach(([name, subtree]) => {
    const item = document.createElement('div');
    item.className = 'tree-item';
    const header = document.createElement('div');
    header.className = 'tree-node';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    const label = document.createElement('span');
    label.textContent = name;
    header.append(iconSpan, label);
    item.append(header);
    const currentPath = path ? `${path}\\${name}` : name;
    if (subtree && typeof subtree === 'object') {
      iconSpan.textContent = '\ue643';
      iconSpan.classList.add('folder-icon');
      header.addEventListener('click', e => {
        e.stopPropagation();
        const open = item.classList.toggle('open');
        iconSpan.textContent = open ? '\uf42e' : '\ue643';
        selectItem(item);
      });
      const children = document.createElement('div');
      children.className = 'children';
      item.append(children);
      renderTree(children, subtree, currentPath);
    } else {
      iconSpan.textContent = '\ue269';
      iconSpan.classList.add('file-icon');
      header.addEventListener('click', e => {
        e.stopPropagation();
        selectItem(item);
        if (name.toLowerCase().endsWith('.ini')) {
          console.log('Clicked .ini file:', currentPath);
        }
      });
    }
    container.append(item);
  });
}

function hideDetails() {
  detailsPanel.classList.add('hidden');
}
function showDetails() {
  detailsPanel.classList.remove('hidden');
}

function displayFlexInfo(filePath) {
  const flexInfo = window.deskflex.getFlexInfo(filePath);
  document.getElementById('name').textContent = flexInfo.Name;
  document.getElementById('author').textContent = flexInfo.Author;
  document.getElementById('version').textContent = flexInfo.Version;
  document.getElementById('license').textContent = flexInfo.License;
  document.getElementById('information').textContent = flexInfo.Information;
}

function initIniClickListener() {
  const treeRoot = document.getElementById('folderTree');
  treeRoot.addEventListener('click', e => {
    const header = e.target.closest('.tree-node');
    if (!header) return;
    const name = header.querySelector('span:last-child').textContent;
    hideDetails();
    if (!name.toLowerCase().endsWith('.ini')) {
      return;
    }
    const segments = [];
    let node = header;
    while (node) {
      segments.unshift(node.querySelector('span:last-child').textContent);
      const parentChildren = node.closest('.children');
      if (!parentChildren) break;
      node = parentChildren.parentElement.querySelector(':scope > .tree-node');
    }
    const rawBase = window.deskflex.flexpath ?? window.deskflex.flexPath ?? '';
    const base = rawBase.replace(/[\/\\]+$/, '');
    const relative = segments.join('\\');
    const fullPath = `${base}\\${relative}`;
    document.getElementById('main-ini').textContent = segments.at(-1);
    document.getElementById('widget').textContent = segments.slice(0, -1).join('\\');
    displayFlexInfo(fullPath);
    showDetails();

  }, true);
}

window.addEventListener('DOMContentLoaded', () => {
  populateDropdown();
  const treeContainer = document.getElementById('folderTree');
  renderTree(treeContainer, window.deskflex.folderStructure);
  initIniClickListener();
  hideDetails();
});

