import { selectItemHandler } from './selection-handler.js';

export function renderTree(container, obj, path = "") {
  Object.entries(obj).forEach(([name, subtree]) => {
    const item = document.createElement("div");
    item.className = "tree-item";
    const header = document.createElement("div");
    header.className = "tree-node";
    const icon = document.createElement("span");
    icon.className = "icon";
    const label = document.createElement("span");
    label.textContent = name;
    header.append(icon, label);
    item.append(header);

    if (subtree && typeof subtree === "object") {
      // Folder
      icon.textContent = "\ue643";
      icon.classList.add("folder-icon");
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        item.classList.toggle("open");
        icon.textContent = item.classList.contains("open")
          ? "\uf42e"
          : "\ue643";
        selectItemHandler(item);
      });
      const children = document.createElement("div");
      children.className = "children";
      item.append(children);
      renderTree(children, subtree, path ? `${path}\\${name}` : name);
    } else {
      // File
      icon.textContent = "\ue269";
      icon.classList.add("file-icon");
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItemHandler(item);
      });
    }
    container.append(item);
  });
}

export function initTreeClickListener() {
  document.getElementById("folderTree").addEventListener(
    "click",
    (e) => {
      const header = e.target.closest(".tree-node");
      if (!header) return;
      const name = header.querySelector("span:last-child").textContent;
      if (!name.toLowerCase().endsWith(".ini")) return;
    },
    true
  );
}