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
      window.location.href = "prices.html";
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
    if (event.key !== "Escape") return;
    if (quoteLightbox?.classList.contains("is-open")) closeQuote();
    else if (lightbox?.classList.contains("is-open")) closeLightbox();
  });

  const quoteLightbox = document.querySelector("#quote-lightbox");
  const quoteCard = quoteLightbox?.querySelector(".quote-lightbox-card");
  const quoteClose = quoteLightbox?.querySelector(".quote-lightbox-close");

  function openQuote(card) {
    if (!quoteLightbox || !quoteCard) return;
    const img = card.querySelector(".testimonial-avatar");
    const quote = card.querySelector("blockquote p");
    const name = card.querySelector("strong");
    const model = card.querySelector(".testimonial-person span");
    const shot = quoteCard.querySelector("img");
    shot.src = img?.src || "";
    shot.alt = img?.alt || "";
    quoteCard.querySelector("p").textContent = quote?.textContent || "";
    quoteCard.querySelector("strong").textContent = name?.textContent || "";
    quoteCard.querySelector("span").textContent = model?.textContent || "";
    quoteLightbox.hidden = false;
    requestAnimationFrame(() => quoteLightbox.classList.add("is-open"));
    document.body.style.overflow = "hidden";
  }

  function closeQuote() {
    if (!quoteLightbox) return;
    quoteLightbox.classList.remove("is-open");
    window.setTimeout(() => {
      if (quoteLightbox.classList.contains("is-open")) return;
      quoteLightbox.hidden = true;
      if (!lightbox?.classList.contains("is-open")) document.body.style.overflow = "";
    }, 280);
  }

  quoteClose?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeQuote();
  });
  quoteLightbox?.addEventListener("click", (event) => {
    if (event.target === quoteLightbox) closeQuote();
  });

  const stage = document.querySelector(".testimonial-stage");
  const viewport = document.querySelector("#testimonial-track");
  const cards = [...document.querySelectorAll("#testimonial-track .testimonial-card")];
  if (stage && viewport && cards.length > 2) {
    let center = 1;
    let busy = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phoneQuery = window.matchMedia("(max-width: 720px)");

    const metrics = () => {
      if (phoneQuery.matches) {
        return { gap: 16, cardW: viewport.clientWidth, single: true };
      }
      const gap = 18;
      const cardW = (viewport.clientWidth - gap * 2) / 3;
      return { gap, cardW, single: false };
    };

    const pose = (slot, cardW, gap, single) => {
      if (single) {
        const visible = slot === 1;
        return {
          transform: `translate3d(${(slot - 1) * (cardW + gap)}px, 0, 0)`,
          opacity: visible ? "1" : "0",
          zIndex: visible ? "3" : "1",
          pointerEvents: visible ? "auto" : "none",
        };
      }
      const scale = slot === 1 ? 1 : 0.94;
      const y = slot === 1 ? 0 : 16;
      const x = slot * (cardW + gap) + ((1 - scale) * cardW) / 2;
      const visible = slot >= 0 && slot <= 2;
      return {
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: visible ? (slot === 1 ? "1" : "0.84") : "0",
        zIndex: slot === 1 ? "3" : "1",
        pointerEvents: visible ? "auto" : "none",
      };
    };

    const apply = (card, slot, animate) => {
      const { cardW, gap, single } = metrics();
      const next = pose(slot, cardW, gap, single);
      card.style.width = `${cardW}px`;
      card.style.transition = animate && !reduced ? "" : "none";
      card.style.transform = next.transform;
      card.style.opacity = next.opacity;
      card.style.zIndex = next.zIndex;
      card.style.pointerEvents = next.pointerEvents;
      card.classList.toggle("is-center", slot === 1);
    };

    const slotFor = (index) => {
      const count = cards.length;
      const left = (center - 1 + count) % count;
      const right = (center + 1) % count;
      if (index === left) return 0;
      if (index === center) return 1;
      if (index === right) return 2;
      return null;
    };

    const layout = (animate, exit) => {
      cards.forEach((card, index) => {
        const slot = slotFor(index);
        if (slot == null) {
          if (exit && index === exit.index) apply(card, exit.slot, animate);
          return;
        }
        apply(card, slot, animate);
      });
      stage.classList.add("is-ready");
    };

    const go = (dir) => {
      if (busy) return;
      busy = true;
      const count = cards.length;
      const outgoing = (center - dir + count) % count;
      const incoming = (center + dir * 2 + count) % count;
      apply(cards[incoming], dir === 1 ? 3 : -1, false);
      void viewport.offsetWidth;
      center = (center + dir + count) % count;
      layout(true, { index: outgoing, slot: dir === 1 ? -1 : 3 });
      window.setTimeout(() => {
        busy = false;
      }, reduced ? 0 : 640);
    };

    cards.forEach((card, index) => {
      const slot = slotFor(index);
      apply(card, slot == null ? 3 : slot, false);
      card.addEventListener("click", (event) => {
        if (event.target.closest(".testimonial-avatar-btn")) return;
        openQuote(card);
      });
    });
    requestAnimationFrame(() => {
      cards.forEach((card) => {
        card.style.transition = "";
      });
      stage.classList.add("is-ready");
    });

    stage.querySelector(".testimonial-prev")?.addEventListener("click", () => go(-1));
    stage.querySelector(".testimonial-next")?.addEventListener("click", () => go(1));
    const relayout = () => {
      cards.forEach((card, index) => {
        const slot = slotFor(index);
        apply(card, slot == null ? 3 : slot, false);
      });
    };
    window.addEventListener("resize", relayout);
    phoneQuery.addEventListener("change", relayout);
  }
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
    return "cost.html?" + params.toString();
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
