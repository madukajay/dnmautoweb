function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokenUser(token) {
  try {
    const payload = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(payload));
    if (!data?.u || Number(data.exp) < Date.now()) return "";
    return String(data.u);
  } catch {
    return "";
  }
}

function initials(username) {
  const local = String(username || "").split("@")[0].replace(/[^a-z0-9]/gi, "");
  return (local.slice(0, 2) || "DN").toUpperCase();
}

function renderSignedOut(slot) {
  const next = location.pathname.endsWith("cost.html") ? `cost.html${location.search}` : "cost.html";
  if (slot) slot.innerHTML = `<a class="btn-pill btn-ghost-light" href="login.html?next=${encodeURIComponent(next)}">Sign in</a>`;
  const menu = document.querySelector("[data-account-menu]");
  if (menu) menu.replaceChildren();
}

function renderSignedIn(slot, username) {
  if (slot) slot.replaceChildren();
  const menu = document.querySelector("[data-account-menu]");
  if (!menu) return;
  const at = String(username).indexOf("@");
  const label = at > 0
    ? `${escapeHtml(username.slice(0, at))}<span class="account-domain">@${escapeHtml(username.slice(at + 1))}</span>`
    : name;
  menu.innerHTML = `
    <div class="account-menu">
      <button type="button" class="account-avatar" aria-haspopup="true" aria-label="Account menu for ${name}">${initials(username)}</button>
      <div class="account-pop">
        <strong>${label}</strong>
        <button type="button" data-sign-out>Sign out</button>
      </div>
    </div>
  `;
}

async function paintAuthSlot() {
  const slot = document.querySelector("[data-auth-slot]");
  if (!slot) return;
  let token = "";
  try {
    token = localStorage.getItem("dnm-auth") || "";
  } catch {
    token = "";
  }
  if (!token) {
    renderSignedOut(slot);
    return;
  }
  const hinted = tokenUser(token);
  if (hinted) renderSignedIn(slot, hinted);
  const base = String(window.DNM_API_BASE || "").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("signed out");
    const session = await response.json();
    renderSignedIn(slot, session.username || hinted);
  } catch {
    try {
      localStorage.removeItem("dnm-auth");
    } catch {
      /* ignore */
    }
    renderSignedOut(slot);
    if (location.pathname.endsWith("cost.html")) {
      location.replace(`login.html?next=${encodeURIComponent(`cost.html${location.search}`)}`);
    }
  }
}

document.addEventListener("click", (event) => {
  const menu = document.querySelector(".account-menu");
  if (menu && event.target.closest(".account-avatar")) {
    menu.classList.toggle("is-open");
  } else if (menu && !event.target.closest(".account-menu")) {
    menu.classList.remove("is-open");
  }
  if (!event.target.closest("[data-sign-out]")) return;
  try {
    localStorage.removeItem("dnm-auth");
  } catch {
    /* ignore */
  }
  if (location.pathname.endsWith("cost.html")) {
    location.replace(`login.html?next=${encodeURIComponent(`cost.html${location.search}`)}`);
    return;
  }
  paintAuthSlot();
});

paintAuthSlot();
