(function initNavTransitions() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const internal = (anchor) => {
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
    if (anchor.getAttribute("href")?.startsWith("mailto:") || anchor.getAttribute("href")?.startsWith("tel:")) {
      return false;
    }
    try {
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (url.pathname === window.location.pathname && url.hash) return false;
      if (url.href === window.location.href) return false;
      return true;
    } catch {
      return false;
    }
  };

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href]");
    if (!internal(anchor)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reduced) return;

    event.preventDefault();
    const href = anchor.href;
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = href;
    }, 260);
  });
})();
