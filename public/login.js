const apiBase = () => String(window.DNM_API_BASE || "").replace(/\/$/, "");

function safeNext(value) {
  const raw = String(value || "cost.html");
  if (!/^(cost\.html|prices\.html|index\.html|\.\/)(\?[A-Za-z0-9._~%&=+\-]*)?$/.test(raw)) return "cost.html";
  return raw;
}

const next = safeNext(new URLSearchParams(window.location.search).get("next"));
const form = document.getElementById("login-form");
const note = document.getElementById("login-note");

try {
  if (localStorage.getItem("dnm-auth")) window.location.replace(next);
} catch {
  /* continue to the form */
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (note) note.textContent = "";
  const response = await fetch(`${apiBase()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: form.username.value,
      password: form.password.value,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    if (note) note.textContent = data.detail || "Those details do not match an account.";
    return;
  }
  try {
    localStorage.setItem("dnm-auth", data.token);
  } catch {
    if (note) note.textContent = "This browser blocked saving the sign-in.";
    return;
  }
  window.location.replace(next);
});
