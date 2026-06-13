const state = {
  slabs: [],
  query: "",
  status: "all",
  grader: "all",
  set: "all",
  sortKey: "purchaseDate",
  sortDirection: "desc",
  selectedCert: "",
};

const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-SG", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const elements = {
  body: document.querySelector("#slabsBody"),
  slabCards: document.querySelector("#slabCards"),
  totalPaid: document.querySelector("#totalPaid"),
  totalMarket: document.querySelector("#totalMarket"),
  totalGain: document.querySelector("#totalGain"),
  totalGainPercent: document.querySelector("#totalGainPercent"),
  gainSubtitle: document.querySelector("#gainSubtitle"),
  vaultedMetric: document.querySelector("#vaultedMetric"),
  vaultedSubtitle: document.querySelector("#vaultedSubtitle"),
  valueSparkline: document.querySelector("#valueSparkline"),
  gainSparkline: document.querySelector("#gainSparkline"),
  railCount: document.querySelector("#railCount"),
  railValue: document.querySelector("#railValue"),
  railCost: document.querySelector("#railCost"),
  railGain: document.querySelector("#railGain"),
  railVaulted: document.querySelector("#railVaulted"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  graderFilter: document.querySelector("#graderFilter"),
  setFilter: document.querySelector("#setFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  sortButtons: document.querySelectorAll("[data-sort-key]"),
  graderChips: document.querySelectorAll("[data-grader-chip]"),
  clearFilters: document.querySelector("#clearFilters"),
  activeFilterCount: document.querySelector("#activeFilterCount"),
  detailDrawer: document.querySelector("#detailDrawer"),
  drawerClose: document.querySelector("#drawerClose"),
  detailContent: document.querySelector("#detailContent"),
  resultCount: document.querySelector("#resultCount"),
};

const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value, compact = false) {
  if (typeof value !== "number") return "-";
  return compact ? compactCurrencyFormatter.format(value) : currencyFormatter.format(value);
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || "-";
  return dateFormatter.format(date);
}

function getGain(slab) {
  const gain = slab.marketSGD - slab.paidSGD;
  const gainPercent = slab.paidSGD ? (gain / slab.paidSGD) * 100 : 0;
  return { gain, gainPercent };
}

function gainClass(value) {
  return value >= 0 ? "gain" : "loss";
}

function formatGain(value) {
  return `<span class="${gainClass(value)}">${value >= 0 ? "+" : ""}${formatCurrency(value)}</span>`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `<span class="${gainClass(value)}">${value >= 0 ? "+" : ""}${percentFormatter.format(value)}%</span>`;
}

function getCompany(grade) {
  return String(grade || "Unknown").split(" ")[0].toUpperCase();
}

function getCertUrl(slab) {
  const cert = encodeURIComponent(slab.cert);
  const grade = String(slab.grade ?? "").toUpperCase();
  if (grade.startsWith("PSA")) return `https://www.psacard.com/cert/${cert}/psa`;
  if (grade.startsWith("ACE")) return "https://acegrading.com/cert";
  return slab.marketSourceUrl || "";
}

function formatCert(slab) {
  const cert = escapeHtml(slab.cert);
  const url = getCertUrl(slab);
  return url ? `<a class="cert-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${cert}</a>` : cert;
}

function getItemNumber(slab) {
  const match = String(slab.card || "").match(/#([A-Za-z0-9/-]+)\s*$/);
  return match ? match[1] : "";
}

function getDisplayTitle(slab) {
  return String(slab.card || "")
    .replace(/^\d{4}\s+Pokemon\s+/i, "")
    .replace(/^Japanese\s+/i, "")
    .replace(/\s+#([A-Za-z0-9/-]+)\s*$/, "")
    .replace(/\s+(SM|SV|S|XY)\d+[A-Za-z]?\s*$/i, "")
    .trim();
}

function getGradeClass(grade) {
  const company = getCompany(grade).toLowerCase();
  return `grade-badge ${company}`;
}

function imageMarkup(slab, mode = "thumb") {
  if (!slab.slabImageUrl) {
    return `<span class="slab-placeholder ${mode}">
      <b>${escapeHtml(getCompany(slab.grade))}</b>
      <span>${escapeHtml(String(slab.grade).replace(" ", ""))}</span>
    </span>`;
  }

  return `<a class="slab-image ${mode}" href="${escapeHtml(slab.slabImageUrl)}" target="_blank" rel="noreferrer">
    <img src="${escapeHtml(slab.slabImageUrl)}" alt="${escapeHtml(`Slab image for ${slab.card}`)}" loading="lazy">
  </a>`;
}

function getStatusClass(status) {
  return String(status || "").toLowerCase().replaceAll(" ", "-");
}

function getSortValue(slab, key) {
  const { gain, gainPercent } = getGain(slab);
  switch (key) {
    case "purchaseDate":
      return slab.purchaseDate || "";
    case "card":
      return `${slab.card || ""} ${slab.set || ""}`;
    case "cert":
      return Number(slab.cert) || slab.cert || "";
    case "grade":
      return slab.grade || "";
    case "paidSGD":
      return slab.paidSGD;
    case "marketSGD":
      return slab.marketSGD;
    case "gainSGD":
      return gain;
    case "gainPercent":
      return gainPercent;
    case "status":
      return slab.status || "";
    default:
      return "";
  }
}

function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a ?? ""), String(b ?? ""));
}

function getFilteredSlabs() {
  const query = state.query.trim().toLowerCase();
  return state.slabs.filter((slab) => {
    const searchable = [slab.card, slab.cert, slab.grade, slab.set, slab.status, slab.marketSourceName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (state.status === "all" || slab.status === state.status) &&
      (state.grader === "all" || getCompany(slab.grade) === state.grader) &&
      (state.set === "all" || slab.set === state.set) &&
      (!query || searchable.includes(query))
    );
  });
}

function getSortedSlabs(slabs) {
  if (!state.sortKey) return slabs;
  return slabs
    .map((slab, index) => ({ slab, index }))
    .sort((left, right) => {
      const primary = compareValues(getSortValue(left.slab, state.sortKey), getSortValue(right.slab, state.sortKey));
      const direction = state.sortDirection === "asc" ? 1 : -1;
      return primary ? primary * direction : left.index - right.index;
    })
    .map((entry) => entry.slab);
}

function topByMarket(slabs, count) {
  return [...slabs].sort((a, b) => b.marketSGD - a.marketSGD).slice(0, count);
}

function renderSparkline(target, values, tone = "yellow") {
  const max = Math.max(...values, 1);
  target.innerHTML = values
    .map((value, index) => `<span class="${tone}" style="height:${Math.max(14, (value / max) * 100)}%" title="Point ${index + 1}"></span>`)
    .join("");
}

function getTimelineValues(slabs, key = "marketSGD") {
  const byDate = [...slabs]
    .sort((a, b) => String(a.purchaseDate).localeCompare(String(b.purchaseDate)))
    .reduce((points, slab) => {
      const last = points.at(-1);
      const value = (last?.value || 0) + (key === "gain" ? getGain(slab).gain : slab[key]);
      if (last && last.date === slab.purchaseDate) last.value = value;
      else points.push({ date: slab.purchaseDate, value: Math.max(0, value) });
      return points;
    }, []);
  return byDate.slice(-16).map((point) => point.value);
}

function renderMetricCards(slabs) {
  const totalPaid = slabs.reduce((sum, slab) => sum + slab.paidSGD, 0);
  const totalMarket = slabs.reduce((sum, slab) => sum + slab.marketSGD, 0);
  const totalGain = totalMarket - totalPaid;
  const gainPercent = totalPaid ? (totalGain / totalPaid) * 100 : 0;
  const vaulted = slabs.filter((slab) => slab.status === "Vaulted").length;
  const vaultedPercent = slabs.length ? (vaulted / slabs.length) * 100 : 0;

  elements.totalMarket.textContent = formatCurrency(totalMarket);
  elements.totalPaid.textContent = formatCurrency(totalPaid);
  elements.totalGain.innerHTML = formatGain(totalGain);
  elements.totalGainPercent.innerHTML = `${formatPercent(gainPercent)} All time`;
  elements.gainSubtitle.innerHTML = `${formatPercent(gainPercent)} All time`;
  elements.vaultedMetric.textContent = String(vaulted);
  elements.vaultedSubtitle.textContent = `${percentFormatter.format(vaultedPercent)}% of collection`;

  elements.railCount.textContent = String(slabs.length);
  elements.railValue.textContent = formatCurrency(totalMarket, true);
  elements.railCost.textContent = formatCurrency(totalPaid, true);
  elements.railGain.innerHTML = formatGain(totalGain);
  elements.railVaulted.textContent = `${vaulted} (${percentFormatter.format(vaultedPercent)}%)`;

  renderSparkline(elements.valueSparkline, getTimelineValues(slabs, "marketSGD"), "yellow");
  renderSparkline(elements.gainSparkline, getTimelineValues(slabs, "gain"), "green");
}

function renderSetOptions(slabs) {
  const sets = [...new Set(slabs.map((slab) => slab.set).filter(Boolean))].sort(collator.compare);
  elements.setFilter.innerHTML = `<option value="all">All</option>${sets
    .map((set) => `<option value="${escapeHtml(set)}">${escapeHtml(set)}</option>`)
    .join("")}`;
}

function renderSortState() {
  elements.sortFilter.value = state.sortKey ? `${state.sortKey}:${state.sortDirection}` : "";
  elements.sortButtons.forEach((button) => {
    const active = button.dataset.sortKey === state.sortKey;
    button.dataset.sortDirection = active ? state.sortDirection : "";
  });
}

function renderFilterState() {
  elements.statusFilter.value = state.status;
  elements.graderFilter.value = state.grader;
  elements.setFilter.value = state.set;
  elements.graderChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.graderChip === state.grader);
  });
  const count = [state.status !== "all", state.grader !== "all", state.set !== "all", Boolean(state.query.trim())].filter(Boolean).length;
  elements.activeFilterCount.textContent = String(count);
}

function selectSlab(cert) {
  state.selectedCert = cert;
  render();
}

function getSelectedSlab(slabs = state.slabs) {
  return slabs.find((slab) => slab.cert === state.selectedCert) || topByMarket(slabs, 1)[0];
}

function renderTable(slabs) {
  if (!slabs.length) {
    elements.body.innerHTML = '<tr><td colspan="9" class="empty">No slabs match the current filters.</td></tr>';
    return;
  }

  elements.body.innerHTML = slabs
    .map((slab) => {
      const { gain, gainPercent } = getGain(slab);
      const statusClass = getStatusClass(slab.status);
      const selected = slab.cert === state.selectedCert;
      return `
        <tr class="${selected ? "is-selected" : ""}" data-cert="${escapeHtml(slab.cert)}" tabindex="0">
          <td><span class="checkbox-marker ${selected ? "checked" : ""}" aria-hidden="true"></span></td>
          <td class="card-cell">
            ${imageMarkup(slab)}
            <span>
              <strong>${escapeHtml(getDisplayTitle(slab))}</strong>
              <small>${escapeHtml(slab.set || "Unknown set")}</small>
              <small>${escapeHtml(getItemNumber(slab) || "No card no.")}</small>
            </span>
          </td>
          <td>${formatCert(slab)}</td>
          <td><span class="${getGradeClass(slab.grade)}">${escapeHtml(slab.grade)}</span></td>
          <td class="numeric">${formatCurrency(slab.paidSGD)}</td>
          <td class="numeric">${formatCurrency(slab.marketSGD)} <i class="${gainClass(gain)} dot"></i></td>
          <td class="numeric">${formatGain(gain)}</td>
          <td class="numeric">${formatPercent(gainPercent)}</td>
          <td><span class="status ${statusClass}">${escapeHtml(slab.status)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderMobileCards(slabs) {
  if (!slabs.length) {
    elements.slabCards.innerHTML = '<article class="empty">No slabs match the current filters.</article>';
    return;
  }

  elements.slabCards.innerHTML = slabs
    .map((slab) => {
      const { gain, gainPercent } = getGain(slab);
      return `
        <article class="mobile-card ${slab.cert === state.selectedCert ? "is-selected" : ""}" data-cert="${escapeHtml(slab.cert)}">
          ${imageMarkup(slab, "card")}
          <div>
            <h3>${escapeHtml(getDisplayTitle(slab))}</h3>
            <p>${escapeHtml(slab.set || "Unknown set")}</p>
            <span class="${getGradeClass(slab.grade)}">${escapeHtml(slab.grade)}</span>
          </div>
          <dl>
            <div><dt>Value</dt><dd>${formatCurrency(slab.marketSGD)}</dd></div>
            <div><dt>Gain</dt><dd>${formatGain(gain)} ${formatPercent(gainPercent)}</dd></div>
          </dl>
        </article>
      `;
    })
    .join("");
}

function renderDetail(slabs) {
  const slab = getSelectedSlab(slabs);
  if (!slab) {
    elements.detailContent.innerHTML = '<p class="empty">Select a slab to view details.</p>';
    return;
  }
  state.selectedCert = slab.cert;
  const { gain, gainPercent } = getGain(slab);
  const statusClass = getStatusClass(slab.status);
  const source = slab.marketSourceName || "Invoice baseline";
  const invoice = slab.invoiceId ? `INV-${slab.marketDate || slab.purchaseDate}-${slab.invoiceId.slice(-4)}` : "Documented";
  const certUrl = getCertUrl(slab);

  elements.detailContent.innerHTML = `
    <section class="drawer-heading">
      <h1>${escapeHtml(getDisplayTitle(slab))}</h1>
      <p>${escapeHtml(slab.set || "Unknown set")}</p>
      <div>
        <span class="${getGradeClass(slab.grade)}">${escapeHtml(slab.grade)}</span>
        <span>Cert # ${formatCert(slab)}</span>
      </div>
    </section>

    <div class="drawer-slab-image">${imageMarkup(slab, "hero")}</div>

    <div class="drawer-actions">
      <button type="button">Add to Watchlist</button>
      <button type="button">Share</button>
    </div>

    <section class="valuation-card">
      <h2>Valuation History (SGD)</h2>
      <div class="range-tabs" aria-label="Chart range">
        <button type="button">7D</button>
        <button type="button">30D</button>
        <button class="active" type="button">90D</button>
        <button type="button">1Y</button>
        <button type="button">All</button>
      </div>
      <div class="line-chart">${renderLineChart(slab)}</div>
      <dl>
        <div><dt>Market</dt><dd>${formatCurrency(slab.marketSGD)} <i class="${gainClass(gain)} dot"></i></dd></div>
        <div><dt>Change</dt><dd>${formatGain(gain)} (${formatPercent(gainPercent)})</dd></div>
      </dl>
    </section>

    <section class="provenance-card">
      <h2>Provenance</h2>
      <dl>
        <div><dt>Source</dt><dd>${escapeHtml(source)}</dd></div>
        <div><dt>Invoice Date</dt><dd>${escapeHtml(slab.marketDate || slab.purchaseDate || "-")}</dd></div>
        <div><dt>Invoice #</dt><dd>${escapeHtml(invoice)}</dd></div>
        <div><dt>Added to Vault</dt><dd>${escapeHtml(slab.purchaseDate || "-")}</dd></div>
        <div><dt>Status</dt><dd><span class="status ${statusClass}">${escapeHtml(slab.status)}</span></dd></div>
      </dl>
    </section>

    ${certUrl ? `<a class="registry-link" href="${escapeHtml(certUrl)}" target="_blank" rel="noreferrer">View on ${escapeHtml(getCompany(slab.grade))} Registry</a>` : ""}
  `;
}

function renderLineChart(slab) {
  const seed = String(slab.cert || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const { gainPercent } = getGain(slab);
  const points = Array.from({ length: 24 }, (_, index) => {
    const wave = Math.sin((seed + index * 4) / 7) * 13;
    const lift = Math.max(-18, Math.min(32, gainPercent / 3));
    return Math.max(16, Math.min(92, 42 + wave + lift + index * 0.9));
  });
  const coordinates = points.map((value, index) => `${(index / (points.length - 1)) * 100},${100 - value}`).join(" ");
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${coordinates}"></polyline>
    <line x1="0" y1="25" x2="100" y2="25"></line>
    <line x1="0" y1="50" x2="100" y2="50"></line>
    <line x1="0" y1="75" x2="100" y2="75"></line>
  </svg>`;
}

function render() {
  const filtered = getSortedSlabs(getFilteredSlabs());
  if (!state.selectedCert && filtered.length) state.selectedCert = topByMarket(filtered, 1)[0].cert;
  if (filtered.length && !filtered.some((slab) => slab.cert === state.selectedCert)) state.selectedCert = filtered[0].cert;

  renderSortState();
  renderFilterState();
  renderMetricCards(state.slabs);
  renderTable(filtered);
  renderMobileCards(filtered);
  renderDetail(filtered);
  elements.resultCount.textContent = filtered.length ? `1-${Math.min(filtered.length, 25)} of ${filtered.length}` : "0 results";
}

async function loadSlabs() {
  try {
    const response = await fetch("data/slabs.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load slabs.json: ${response.status}`);
    const data = await response.json();
    state.slabs = data.slabs;
    renderSetOptions(state.slabs);
    state.selectedCert = "";
    render();
  } catch (error) {
    elements.body.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(error.message)}</td></tr>`;
    elements.slabCards.innerHTML = `<article class="empty">${escapeHtml(error.message)}</article>`;
    elements.detailContent.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

elements.statusFilter.addEventListener("change", (event) => {
  state.status = event.target.value;
  render();
});

elements.graderFilter.addEventListener("change", (event) => {
  state.grader = event.target.value;
  render();
});

elements.setFilter.addEventListener("change", (event) => {
  state.set = event.target.value;
  render();
});

elements.sortFilter.addEventListener("change", (event) => {
  const [sortKey, sortDirection] = event.target.value.split(":");
  state.sortKey = sortKey || "purchaseDate";
  state.sortDirection = sortDirection || "desc";
  render();
});

elements.sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextKey = button.dataset.sortKey;
    if (state.sortKey === nextKey) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    else {
      state.sortKey = nextKey;
      state.sortDirection = "asc";
    }
    render();
  });
});

elements.graderChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    state.grader = state.grader === chip.dataset.graderChip ? "all" : chip.dataset.graderChip;
    render();
  });
});

elements.clearFilters.addEventListener("click", () => {
  state.query = "";
  state.status = "all";
  state.grader = "all";
  state.set = "all";
  elements.searchInput.value = "";
  render();
});

elements.body.addEventListener("click", (event) => {
  if (event.target.closest("a, button")) return;
  const row = event.target.closest("[data-cert]");
  if (row) selectSlab(row.dataset.cert);
});

elements.body.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("[data-cert]");
  if (!row) return;
  event.preventDefault();
  selectSlab(row.dataset.cert);
});

elements.slabCards.addEventListener("click", (event) => {
  if (event.target.closest("a, button")) return;
  const card = event.target.closest("[data-cert]");
  if (card) selectSlab(card.dataset.cert);
});

elements.drawerClose.addEventListener("click", () => {
  elements.detailDrawer.classList.toggle("is-collapsed");
});

loadSlabs();
