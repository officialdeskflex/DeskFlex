/* 
*Set DarkMode/ColorTheme.
*/
if (window.deskflex.darkMode) {
  document.body.classList.add('dark-mode');
} else {
  document.body.classList.remove('dark-mode');
}

/* 
*Dynamically populate dropdown from activeFlex.
*/
function populateDropdown() {
  const dropdown = document.getElementById("myDropdown");
  dropdown.innerHTML = "";
  if (Array.isArray(window.deskflex.activeFlex)) {
    window.deskflex.activeFlex.forEach(item => {
      const option = document.createElement("a");
      option.href = "#";
      option.textContent = item;
      dropdown.appendChild(option);
    });
  }
}

function toggleDropdown() {
  const dropdown = document.getElementById("myDropdown");
  const rectangle = document.querySelector('.rectangleActiveList');
  dropdown.classList.toggle("show");
  rectangle.classList.toggle("open");
}
window.toggleDropdown = toggleDropdown;
window.addEventListener('DOMContentLoaded', populateDropdown);
/*
*  Animate AddFlex Button
*/
const icon = document.querySelector('.addFlexIcon');
icon.addEventListener('click', () => {
  icon.classList.add('animate');
  setTimeout(() => icon.classList.remove('animate'), 200);
});

/*
*  Logging
*/
console.log(JSON.stringify(window.deskflex.folderStructure, null, 2));
console.log(window.deskflex.activeFlex);