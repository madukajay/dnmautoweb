const THEME_KEY = "dnm-theme";

function themeName() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function paintThemeToggle() {
  const light = themeName() === "light";
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.setAttribute("aria-pressed", light ? "false" : "true");
    button.setAttribute("aria-label", light ? "Turn on dark mode" : "Turn off dark mode");
    const label = button.querySelector(".theme-toggle-label");
    if (label) label.textContent = light ? "Light" : "Dark";
  }
}

function setTheme(theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, theme === "light" ? "light" : "dark");
  } catch {
    /* private browsing can block storage; the choice still applies this page */
  }
  paintThemeToggle();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-toggle]");
  if (!button) return;
  setTheme(themeName() === "light" ? "dark" : "light");
});

window.addEventListener("pageshow", paintThemeToggle);
paintThemeToggle();
