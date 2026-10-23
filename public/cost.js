/* Import cost page. Sends inputs to the API and renders the numbers.
 * The formulas stay on the server.
 */
const vehicleSelect = document.getElementById("vehicle");
const vehicleVariantSelect = document.getElementById("vehicleVariant");
const winningBidInput = document.getElementById("winningBid");
const areaCostInput = document.getElementById("areaCost");
const ssclInput = document.getElementById("sscl");
const auctionFeeInput = document.getElementById("auctionFee");
const yenrateInput = document.getElementById("yenrate");
const clearingInput = document.getElementById("clearing");
const calculateBtn = document.getElementById("calculateBtn");
const surchargeToggle = document.getElementById("surchargeToggle");
const surchargeToggleState = document.getElementById("surchargeToggleState");
const earlyResults = document.getElementById("earlyResults");
const lateResults = document.getElementById("lateResults");
const taxBreakdown = document.getElementById("taxBreakdown");
const totalPayableElement = document.getElementById("totalPayable");
const vehicleInfo = document.getElementById("vehicleInfo");
const taxCategorySelect = document.getElementById("taxcategory");
const taxBaseInput = document.getElementById("taxbase");
const exporterSelect = document.getElementById("exporter");
const capacityInput = document.getElementById("capacity");

const apiBase = () => String(window.DNM_API_BASE || "").replace(/\/$/, "");

function authHeaders(extra = {}) {
  const headers = { ...extra };
  try {
    const token = localStorage.getItem("dnm-auth");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage can be blocked */
  }
  return headers;
}

function sendToLogin() {
  const next = `cost.html${window.location.search}`;
  window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
}

async function authFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: authHeaders(options.headers || {}) });
  if (response.status === 401) {
    try { localStorage.removeItem("dnm-auth"); } catch { /* ignore */ }
    sendToLogin();
  }
  return response;
}
let catalogVehicles = {};
let calcTimer = 0;

function formatCurrency(amount) {
  const formatted = Math.round(Number(amount) || 0).toLocaleString("en-US");
  return `LKR ${formatted}`;
}

function formatTaxName(key) {
  const names = {
    agentValue: "Agent Value (LKR)",
    CIF: "CIF",
    exciseDuty: "Excise Duty",
    cid: "CID (30% of CIF)",
    surcharge: "SUR (50% of CID)",
    sscl: "SSCL (2.5%)",
    vat: "VAT (18%)",
    vel: "Vehicle Emission Levy",
    com: "COM/EXM/SEL",
    luxuryTax: "Luxury Tax",
  };
  return names[key] || key;
}

function createResultCard(title, value, isLKR = false) {
  const card = document.createElement("div");
  card.className = "result-card";
  const titleEl = document.createElement("div");
  titleEl.className = "result-title";
  titleEl.textContent = title;
  const valueEl = document.createElement("div");
  valueEl.className = "result-value";
  const formatted = Math.round(Number(value) || 0).toLocaleString("en-US");
  valueEl.classList.add(isLKR ? "result-value-lkr" : "result-value-lkr");
  valueEl.innerHTML = `<span class="currency-symbol">LKR</span><span class="amount-num">${formatted}</span>`;
  card.appendChild(titleEl);
  card.appendChild(valueEl);
  return card;
}

function updateVehicleInfo(vehicle, grade, yenRate) {
  vehicleInfo.innerHTML = `
    <div>
      <span class="vehicle-model">${vehicle}</span>
      <div class="vehicle-meta">Grade: <strong>${grade || "—"}</strong></div>
    </div>
    <div class="vehicle-rate">
      <span class="vehicle-meta">JPY rate</span>
      <strong class="vehicle-shipping">${yenRate}</strong>
    </div>
  `;
}

function normalizeGrade(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/e:hev|ehev/g, " hv ")
    .replace(/\b(hybrid|hev|hv)\b/g, " hv ")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchVariantIndex(labels, grade) {
  if (!labels || !labels.length) return 0;
  const wanted = normalizeGrade(grade);
  if (!wanted) return 0;
  const normalized = labels.map((label) => normalizeGrade(label));
  const exact = normalized.indexOf(wanted);
  if (exact >= 0) return exact;
  const wantedTokens = wanted.split(" ");
  const wantsHybrid = wantedTokens.includes("hv");
  let best = 0;
  let bestScore = 0;
  normalized.forEach((label, index) => {
    const tokens = label.split(" ");
    let score = 0;
    if (label.startsWith(`${wanted} `)) score += 80;
    if (tokens[0] === wantedTokens[0]) score += 60;
    score += wantedTokens.filter((token) => tokens.includes(token)).length * 12;
    score += tokens.includes("hv") === wantsHybrid ? 6 : -6;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return bestScore >= 60 ? best : 0;
}

function fillGrades() {
  const labels = catalogVehicles[vehicleSelect.value] || [];
  vehicleVariantSelect.innerHTML = "";
  labels.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = label;
    vehicleVariantSelect.appendChild(option);
  });
}

async function loadVariant(index) {
  const vehicle = vehicleSelect.value;
  const response = await authFetch(
    `${apiBase()}/api/cost/variant?vehicle=${encodeURIComponent(vehicle)}&index=${encodeURIComponent(index)}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Could not load this grade.");
  if (taxCategorySelect.querySelector(`option[value="${data.taxCategory}"]`)) {
    taxCategorySelect.value = data.taxCategory;
  }
  taxBaseInput.value = data.taxbase;
  capacityInput.value = data.capacity;
  winningBidInput.value = data.winningBid;
}

function payload() {
  return {
    vehicle: vehicleSelect.value,
    winningBid: winningBidInput.value,
    yenrate: yenrateInput.value,
    clearing: clearingInput.value,
    capacity: capacityInput.value,
    taxbase: taxBaseInput.value,
    sscl: ssclInput.value,
    areaCost: areaCostInput.value,
    exporter: exporterSelect.value,
    taxCategory: taxCategorySelect.value,
    auctionFee: auctionFeeInput.value,
    applySurcharge: Boolean(surchargeToggle?.checked),
  };
}

function renderQuote(data) {
  const grade = vehicleVariantSelect.selectedOptions[0]?.textContent?.trim() || "";
  updateVehicleInfo(vehicleSelect.value, grade, data.yenrate);
  earlyResults.replaceChildren();
  lateResults.replaceChildren();
  taxBreakdown.replaceChildren();
  for (const item of data.early || []) {
    earlyResults.appendChild(createResultCard(item.title, item.value, true));
  }
  for (const [key, value] of Object.entries(data.taxes || {})) {
    const taxItem = document.createElement("div");
    taxItem.className = "tax-item";
    if (key === "agentValue") taxItem.classList.add("tax-item-agent");
    const taxName = document.createElement("div");
    taxName.className = "tax-name";
    taxName.textContent = formatTaxName(key);
    const taxAmount = document.createElement("div");
    taxAmount.className = "tax-amount";
    taxAmount.textContent = formatCurrency(value);
    taxItem.appendChild(taxName);
    taxItem.appendChild(taxAmount);
    taxBreakdown.appendChild(taxItem);
  }
  const totalTaxItem = document.createElement("div");
  totalTaxItem.className = "tax-item tax-item-total";
  totalTaxItem.innerHTML = `<div class="tax-name">Total Tax (LKR)</div><div class="tax-amount">${formatCurrency(data.totalTax)}</div>`;
  taxBreakdown.appendChild(totalTaxItem);
  lateResults.appendChild(createResultCard("Clearing Charges (LKR)", data.clearing, true));
  totalPayableElement.innerHTML = `<span>Total Amount Payable:</span><span>${formatCurrency(data.total)}</span>`;
}

async function calculateAndDisplay() {
  const response = await authFetch(`${apiBase()}/api/cost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload()),
  });
  const data = await response.json();
  if (!response.ok) {
    totalPayableElement.textContent = data.detail || "Could not calculate.";
    return;
  }
  renderQuote(data);
}

function scheduleCalculate() {
  window.clearTimeout(calcTimer);
  calcTimer = window.setTimeout(() => {
    calculateAndDisplay().catch((error) => {
      totalPayableElement.textContent = error.message;
    });
  }, 250);
}

async function applySelectedVariant() {
  await loadVariant(vehicleVariantSelect.value || "0");
  await calculateAndDisplay();
}

function updateSurchargeToggleLabel() {
  if (!surchargeToggleState) return;
  surchargeToggleState.textContent = surchargeToggle?.checked ? "On" : "Off";
}

function renderUserList(names) {
  const list = document.getElementById("user-list");
  if (!list) return;
  list.replaceChildren();
  if (!names.length) {
    const empty = document.createElement("li");
    empty.className = "fine";
    empty.textContent = "No customers yet.";
    list.appendChild(empty);
    return;
  }
  for (const name of names) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      const response = await authFetch(`${apiBase()}/api/auth/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      const data = await response.json();
      if (response.ok) renderUserList(data.users || []);
    });
    item.append(label, remove);
    list.appendChild(item);
  }
}

function setUserDrawer(open) {
  const drawer = document.getElementById("user-drawer");
  if (!drawer) return;
  if (open) {
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    return;
  }
  drawer.classList.remove("is-open");
  window.setTimeout(() => {
    if (!drawer.classList.contains("is-open")) drawer.hidden = true;
  }, 320);
}

async function bootAdmin() {
  const me = await authFetch(`${apiBase()}/api/auth/me`);
  const session = await me.json();
  if (!me.ok || session.role !== "admin") return;
  const opener = document.getElementById("open-users");
  const drawer = document.getElementById("user-drawer");
  if (!opener || !drawer) return;
  opener.hidden = false;
  const response = await authFetch(`${apiBase()}/api/auth/users`);
  const data = await response.json();
  if (response.ok) renderUserList(data.users || []);
  opener.addEventListener("click", () => setUserDrawer(true));
  drawer.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-users]")) setUserDrawer(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setUserDrawer(false);
  });
  document.getElementById("add-user")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const note = document.getElementById("admin-note");
    const response = await authFetch(`${apiBase()}/api/auth/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username.value,
        password: form.password.value,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (note) note.textContent = data.detail || "Could not add that user.";
      return;
    }
    form.reset();
    if (note) note.textContent = "User added.";
    renderUserList(data.users || []);
  });
}

async function bootCalculator() {
  const session = await authFetch(`${apiBase()}/api/auth/me`);
  if (!session.ok) return;
  bootAdmin().catch(() => {});
  const response = await authFetch(`${apiBase()}/api/cost/catalog`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Could not load vehicles.");
  catalogVehicles = data.vehicles || {};
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("model");
  if (requested && [...vehicleSelect.options].some((option) => option.value === requested)) {
    vehicleSelect.value = requested;
  }
  fillGrades();
  const labels = catalogVehicles[vehicleSelect.value] || [];
  const grade = params.get("grade");
  if (grade && labels.length) vehicleVariantSelect.value = String(matchVariantIndex(labels, grade));
  await loadVariant(vehicleVariantSelect.value || "0");
  const bid = Number(params.get("bid"));
  const cc = Number(String(params.get("cc") || "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(bid) && bid > 0) winningBidInput.value = String(Math.round(bid));
  const currentCc = Number(capacityInput.value);
  if (Number.isFinite(cc) && cc >= 500 && currentCc >= 500) capacityInput.value = String(Math.round(cc));
  await calculateAndDisplay();
}

calculateBtn.addEventListener("click", () => {
  calculateAndDisplay().catch((error) => {
    totalPayableElement.textContent = error.message;
  });
});
surchargeToggle?.addEventListener("change", () => {
  updateSurchargeToggleLabel();
  scheduleCalculate();
});
updateSurchargeToggleLabel();
vehicleSelect.addEventListener("change", () => {
  fillGrades();
  applySelectedVariant().catch((error) => {
    totalPayableElement.textContent = error.message;
  });
});
vehicleVariantSelect.addEventListener("change", () => {
  applySelectedVariant().catch((error) => {
    totalPayableElement.textContent = error.message;
  });
});
for (const input of [winningBidInput, areaCostInput, ssclInput, auctionFeeInput, yenrateInput, clearingInput, capacityInput, taxBaseInput]) {
  input?.addEventListener("input", scheduleCalculate);
}
taxCategorySelect.addEventListener("change", scheduleCalculate);
exporterSelect?.addEventListener("change", scheduleCalculate);
bootCalculator().catch((error) => {
  totalPayableElement.textContent = error.message;
});
