/* Home page scroll reveal + micro-interactions */
(function initHomePage() {
  if (!document.body.classList.contains("home-page")) return;

  const reveals = document.querySelectorAll(".reveal");
  if (!reveals.length || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    reveals.forEach((el) => observer.observe(el));
  }

  const play = document.querySelector(".play-btn");
  if (play) {
    play.addEventListener("click", () => {
      window.location.href = "/prices.html";
    });
  }

  const lightbox = document.querySelector("#photo-lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  const lightboxClose = lightbox?.querySelector(".photo-lightbox-close");

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.classList.remove("is-open");
    window.setTimeout(() => {
      if (lightbox.classList.contains("is-open")) return;
      lightbox.hidden = true;
      lightboxImg.removeAttribute("src");
      lightboxImg.alt = "";
    }, 280);
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".testimonial-avatar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLightbox(btn.dataset.lightboxSrc, btn.dataset.lightboxAlt);
    });
  });

  lightboxClose?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.classList.contains("is-open")) closeLightbox();
  });
})();

/* Sold-prices page */
(function initPricesPage() {
  const form = document.querySelector("#filters");
  if (!form) return;

  const apiBase = String(window.DNM_API_BASE || "").replace(/\/$/, "");
  const apiUrl = (path) => apiBase + path;

  const makerSelect = document.querySelector("#maker");
  const modelSelect = document.querySelector("#model");
  const typeList = document.querySelector("#type-list");
  const typeInput = document.querySelector("#model_type");
  const rowsEl = document.querySelector("#rows");
  const summaryEl = document.querySelector("#summary");
  const pagerEl = document.querySelector("#pager");
  const emptyEl = document.querySelector("#empty");
  const catalogNote = document.querySelector("#catalog-note");

  const number = new Intl.NumberFormat("en-US");
  let page = 1;
  let pages = 1;

  const SCORES = ["", "***", "-", "1", "2", "3", "3.5", "4", "4.5", "5", "6", "7", "8", "9", "R", "RA", "S"];
  const COLORS = [
    ["", "Any"],
    ["1", "Beige"],
    ["2", "Black"],
    ["3", "Dark blue"],
    ["4", "Brown"],
    ["5", "Gold"],
    ["6", "Grey"],
    ["7", "Green"],
    ["8", "Orange"],
    ["9", "White night"],
    ["10", "Pink"],
    ["11", "Red"],
    ["12", "Silver"],
    ["13", "Violet"],
    ["14", "White"],
    ["15", "Wine"],
    ["16", "Yellow"],
  ];

  function fillFixed(select, entries, anyLabel) {
    select.replaceChildren();
    if (anyLabel) {
      const any = document.createElement("option");
      any.value = "";
      any.textContent = anyLabel;
      select.appendChild(any);
    }
    for (const entry of entries) {
      const option = document.createElement("option");
      if (Array.isArray(entry)) {
        option.value = entry[0];
        option.textContent = entry[1];
      } else {
        option.value = entry;
        option.textContent = entry || anyLabel;
      }
      if (option.value !== "" || !anyLabel) select.appendChild(option);
    }
  }

  fillFixed(document.querySelector("#score"), SCORES.filter(Boolean).map((score) => [score, score]), "Any");
  fillFixed(document.querySelector("#color"), COLORS.slice(1), "Any");

  function optionList(select, items, anyLabel, anyValue) {
    const current = select.value;
    select.replaceChildren();
    const any = document.createElement("option");
    any.value = anyValue;
    any.textContent = anyLabel;
    select.appendChild(any);
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      select.appendChild(option);
    }
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  async function loadMakers() {
    const response = await fetch(apiUrl("/api/makers"));
    const data = await response.json();
    if (!response.ok) {
      catalogNote.textContent = data.detail || "Could not load makers.";
      return;
    }
    optionList(makerSelect, data.makers, "All makers", "-1");
    catalogNote.textContent = `${data.makers.length} makers. Pick one to load its models.`;
  }

  async function loadModels() {
    const maker = makerSelect.value;
    optionList(modelSelect, [], "All models", "-1");
    typeInput.value = "";
    typeList.replaceChildren();
    if (!maker || maker === "-1") return;
    modelSelect.options[0].textContent = "Loading models…";
    const response = await fetch(apiUrl("/api/models?maker=" + encodeURIComponent(maker)));
    const data = await response.json();
    if (!response.ok) {
      catalogNote.textContent = data.detail || "Could not load models.";
      optionList(modelSelect, [], "All models", "-1");
      return;
    }
    optionList(modelSelect, data.models, "All models", "-1");
    catalogNote.textContent = `${data.models.length} models for this maker.`;
  }

  async function loadTypes() {
    const maker = makerSelect.value;
    const model = modelSelect.value;
    typeList.replaceChildren();
    if (!maker || maker === "-1" || !model || model === "-1") return;
    const response = await fetch(
      apiUrl("/api/types?maker=" + encodeURIComponent(maker) + "&model=" + encodeURIComponent(model)),
    );
    const data = await response.json();
    if (!response.ok) return;
    for (const type of data.types) {
      const option = document.createElement("option");
      option.value = type;
      typeList.appendChild(option);
    }
  }

  function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function ensureAuctionDates() {
    const fromEl = document.querySelector("#date_from");
    const toEl = document.querySelector("#date_to");
    if (!fromEl || !toEl) return;
    if (fromEl.value && toEl.value) return;
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    fromEl.value = isoDate(start);
    toEl.value = isoDate(end);
  }

  function payload(pageNumber) {
    ensureAuctionDates();
    const body = { page: pageNumber };
    for (const element of form.elements) {
      if (!element.name || element.value.trim() === "") continue;
      body[element.name] = element.value.trim();
    }
    return body;
  }

  function renderPager() {
    pagerEl.replaceChildren();
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "ghost";
    prev.textContent = "Previous";
    prev.disabled = page <= 1;
    prev.addEventListener("click", () => search(page - 1));
    const label = document.createElement("span");
    label.className = "page-label";
    label.textContent = `Page ${page} of ${pages}`;
    const next = document.createElement("button");
    next.type = "button";
    next.className = "ghost";
    next.textContent = "Next";
    next.disabled = page >= pages;
    next.addEventListener("click", () => search(page + 1));
    pagerEl.append(prev, label, next);
  }

  const IMPORT_MODELS = [
    "Alto", "Aqua", "Audi A3", "Axio", "C-HR", "Corolla cross", "CR-V", "EK Wagon",
    "Every", "Fit HV", "Flair", "Honda WR-V", "Hustler", "Leaf", "Mira", "Move",
    "Nissan Dayz", "Note", "Raize", "Rocky", "Roomy", "ROOX", "Spacia", "Swift",
    "TAFT", "THOR", "Vezel HV", "Wagon R", "X bee", "Yaris", "Yaris Cross",
  ];

  function compactName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function modelAliases(name) {
    const full = compactName(name);
    const bare = full.replace(/^(toyota|honda|nissan|suzuki|daihatsu|mazda|mitsubishi|audi)/, "");
    const loosen = (key) => key.replace(/hybrid|ehev|hev|hv/g, "");
    return [full, bare, loosen(full), loosen(bare)].filter(Boolean);
  }

  const importModels = new Map();
  for (const name of IMPORT_MODELS) {
    for (const key of new Set(modelAliases(name))) {
      const existing = importModels.get(key);
      if (existing && existing !== name) importModels.set(key, "");
      else if (!existing) importModels.set(key, name);
    }
  }

  function calculatorModel(lot) {
    const model = compactName(lot.model);
    const withMaker = compactName(`${lot.maker || ""} ${lot.model || ""}`);
    const keys = [model, withMaker, model.replace(/hybrid|ehev|hev|hv/g, ""), withMaker.replace(/hybrid|ehev|hev|hv/g, "")];
    for (const key of keys) {
      const match = importModels.get(key);
      if (match) return match;
    }
    return "";
  }

  function importCostHref(lot, model) {
    const params = new URLSearchParams({ model });
    if (lot.grade) params.set("grade", lot.grade);
    if (lot.end_thousand_jpy != null) params.set("bid", String(lot.end_thousand_jpy * 1000));
    const cc = String(lot.displacement || "").replace(/[^\d]/g, "");
    if (cc) params.set("cc", cc);
    return "/cost.html?" + params.toString();
  }

  function cell(text, className) {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text || "—";
    return td;
  }

  function renderRows(lots) {
    rowsEl.replaceChildren();
    emptyEl.hidden = lots.length > 0;
    for (const lot of lots) {
      const tr = document.createElement("tr");
      const photoCell = document.createElement("td");
      if (lot.photo && lot.photo.startsWith("https://")) {
        const img = document.createElement("img");
        img.className = "thumb";
        img.alt = "";
        img.src = lot.photo;
        photoCell.appendChild(img);
      } else {
        const box = document.createElement("div");
        box.className = "placeholder";
        photoCell.appendChild(box);
      }
      tr.appendChild(photoCell);
      tr.append(
        cell(lot.date),
        cell(lot.lot),
        cell(lot.auction),
        cell(lot.maker),
        cell(lot.model),
        cell(lot.grade),
        cell(lot.year, "num"),
        cell(lot.mileage, "num"),
        cell(lot.displacement, "num"),
        cell(lot.transmission),
        cell(lot.color),
        cell(lot.model_type),
        cell(lot.end_thousand_jpy == null ? "—" : number.format(lot.end_thousand_jpy), "num"),
        cell(lot.result, "status"),
        cell(lot.score),
      );
      const costCell = document.createElement("td");
      costCell.className = "cost";
      const modelName = calculatorModel(lot);
      if (modelName) {
        const link = document.createElement("a");
        link.className = "cost-link";
        link.href = importCostHref(lot, modelName);
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Approximate Import Cost";
        costCell.appendChild(link);
      }
      tr.appendChild(costCell);
      rowsEl.appendChild(tr);
    }
  }

  async function search(pageNumber) {
    page = pageNumber;
    summaryEl.classList.remove("error");
    summaryEl.textContent = "Searching…";
    emptyEl.hidden = true;
    const response = await fetch(apiUrl("/api/lots"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(pageNumber)),
    });
    const data = await response.json();
    if (!response.ok) {
      summaryEl.textContent = data.detail || "Search failed.";
      summaryEl.classList.add("error");
      rowsEl.replaceChildren();
      pagerEl.replaceChildren();
      return;
    }
    const count = data.count || 0;
    const shown = (data.lots || []).length;
    const start = count === 0 ? 0 : (data.page - 1) * data.page_size + 1;
    const end = count === 0 ? 0 : start + shown - 1;
    pages = Math.max(1, data.pages || 1);
    page = data.page || pageNumber;
    summaryEl.textContent = count === 0
      ? "0 lots"
      : `Showing ${number.format(start)}–${number.format(end)} of ${number.format(count)}`;
    renderRows(data.lots || []);
    renderPager();
  }

  makerSelect.addEventListener("change", () => {
    loadModels();
  });
  modelSelect.addEventListener("change", () => {
    loadTypes();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search(1);
  });
  document.querySelector("#reset").addEventListener("click", () => {
    form.reset();
    loadModels();
    summaryEl.textContent = "Filters cleared.";
    rowsEl.replaceChildren();
    pagerEl.replaceChildren();
    emptyEl.hidden = true;
  });

  loadMakers();
})();
