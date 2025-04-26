let selectedItem = null;
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

window.addEventListener('DOMContentLoaded', () => {
  populateDropdown();
  const treeContainer = document.getElementById('folderTree');
  renderTree(treeContainer, window.deskflex.folderStructure);
});
