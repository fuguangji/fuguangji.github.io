const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  currentThemeIndex = themes.indexOf(savedTheme);
}

function toggleMenu() {
  document.getElementById("menuContent").classList.toggle("show");
}

// 點擊選單外部自動關閉
window.onclick = function (event) {
  if (!event.target.matches("#menu")) {
    var dropdowns = document.getElementsByClassName("menu-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

const themes = [
  "midnight-lamp",
  "ice-fog",
  "night-pine",
  "almond-pen",
  "fantasy-starry-night",
  "morning-mist",
  "pine-almond",
];
let currentThemeIndex = 0;

function switchTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const nextTheme = themes[currentThemeIndex];

  localStorage.setItem("theme", nextTheme);
  document.documentElement.setAttribute("data-theme", nextTheme);
}
