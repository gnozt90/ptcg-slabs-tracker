const state = {
  slabs: [],
  query: "",
  status: "all",
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
  totalPaid: document.querySelector("#totalPaid"),
  totalMarket: document.querySelector("#totalMarket"),
  totalGain: document.querySelector("#totalGain"),
  totalGainPercent: document.querySelector("#totalGainPercent"),
  heroMarket: document.querySelector("#heroMarket"),
  heroCount: document.querySelector("#heroCount"),
  heroVaulted: document.querySelector("#heroVaulted"),
  statusPills: document.querySelector("#statusPills"),
  lastUpdated: document.querySelector("#lastUpdated"),
  analyticsDate: document.querySelector("#analyticsDate"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  featuredGrails: document.querySelector("#featuredGrails"),
  gradingBreakdown: document.querySelector("#gradingBreakdown"),
  eraBreakdown: document.querySelector("#eraBreakdown"),
  languageBreakdown: document.querySelector("#languageBreakdown"),
  portfolioHealth: document.querySelector("#portfolioHealth"),
  healthBadge: document.querySelector("#healthBadge"),
  trendLine: document.querySelector("#trendLine"),
  gradeDistribution: document.querySelector("#gradeDistribution"),
  diversificationScore: document.querySelector("#diversificationScore"),
  diversificationText: document.querySelector("#diversificationText"),
  provenanceCards: document.querySelector("#provenanceCards"),
  recentAcquisitions: document.querySelector("#recentAcquisitions"),
  collectionTimeline: document.querySelector("#collectionTimeline"),
  milestones: document.querySelector("#milestones"),
  rarityStats: document.querySelector("#rarityStats"),
  topPerformers: document.querySelector("#topPerformers"),
};

function formatCurrency(value, compact = false) {
  if (typeof value !== "number") return "-";
  return compact ? compactCurrencyFormatter.format(value) : currencyFormatter.format(value);
}

function formatGain(value) {
  const className = value >= 0 ? "gain" : "loss";
  return `<span class="${className}">${formatCurrency(value)}</span>`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  const className = value >= 0 ? "gain" : "loss";
  return `<span class="${className}">${percentFormatter.format(value)}%</span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatCert(slab) {
  const cert = escapeHtml(slab.cert);
  const grade = String(slab.grade ?? "").toUpperCase();

  if (grade.startsWith("PSA")) {
    return `<a class="cert-link" href="https://www.psacard.com/cert/${cert}/psa" target="_blank" rel="noreferrer">${cert}</a>`;
  }

  if (grade.startsWith("ACE")) {
    return `<a class="cert-link" href="https://acegrading.com/cert" target="_blank" rel="noreferrer" title="Open ACE certification lookup">${cert}</a>`;
  }

  return cert;
}

function formatSlabImage(slab, size = "table") {
  const frontUrl = slab.slabImageUrl;

  if (!frontUrl) {
    return `<span class="catalog-placeholder ${size === "large" ? "large" : ""}" aria-hidden="true">
      <span>${escapeHtml(getCompany(slab.grade))}</span>
      <strong>${escapeHtml(String(slab.grade).replace(" ", ""))}</strong>
    </span>`;
  }

  const imageAlt = `Slab image for ${slab.card}`;
  const previewImage = `<img src="${escapeHtml(frontUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy">`;

  return `
    <a class="slab-image-link ${size === "large" ? "large" : ""}" href="${escapeHtml(frontUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(imageAlt)}">
      <img class="slab-thumb" src="${escapeHtml(frontUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy">
      <span class="slab-preview" aria-hidden="true">${previewImage}</span>
    </a>
  `;
}

function getCompany(grade) {
  return String(grade || "Unknown").split(" ")[0].toUpperCase();
}

function getCardYear(card) {
  const match = String(card).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function getEra(slab) {
  const year = getCardYear(slab.card);
  if (!year) return "Unknown";
  if (year <= 2016) return "XY & earlier";
  if (year <= 2019) return "Sun & Moon";
  if (year <= 2022) return "Sword & Shield";
  return "Scarlet & Violet";
}

function getLanguage(slab) {
  return /japanese/i.test(slab.card) ? "Japanese" : "English / other";
}

function getFilteredSlabs() {
  const query = state.query.trim().toLowerCase();

  return state.slabs.filter((slab) => {
    const statusMatches = state.status === "all" || slab.status === state.status;
    const searchable = [
      slab.card,
      slab.cert,
      slab.grade,
      slab.set,
      slab.status,
      slab.marketSourceName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return statusMatches && (!query || searchable.includes(query));
  });
}

function countBy(slabs, getKey) {
  return slabs.reduce((counts, slab) => {
    const key = getKey(slab);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topByMarket(slabs, count) {
  return [...slabs].sort((a, b) => b.marketSGD - a.marketSGD).slice(0, count);
}

function renderBreakdown(target, entries, total) {
  target.innerHTML = entries
    .map(([label, count]) => {
      const pct = total ? (count / total) * 100 : 0;
      return `
        <div class="breakdown-row">
          <div><span>${escapeHtml(label)}</span><strong>${count} (${Math.round(pct)}%)</strong></div>
          <span class="bar"><i style="width: ${pct}%"></i></span>
        </div>
      `;
    })
    .join("");
}

function renderFeaturedGrails(slabs) {
  const grails = topByMarket(slabs, 7);

  elements.featuredGrails.innerHTML = grails
    .map((slab, index) => `
      <article class="grail-card">
        <span class="lot-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="grail-image">${formatSlabImage(slab, "large")}</div>
        <div class="grail-copy">
          <p>${escapeHtml(slab.grade)} · ${escapeHtml(slab.set)}</p>
          <h3>${escapeHtml(slab.card)}</h3>
          <dl>
            <div><dt>Market</dt><dd>${formatCurrency(slab.marketSGD, slab.marketSGD > 999)}</dd></div>
            <div><dt>Custody</dt><dd>${escapeHtml(slab.status)}</dd></div>
          </dl>
        </div>
      </article>
    `)
    .join("");
}

function renderOverview(slabs) {
  const total = slabs.length;
  const grading = Object.entries(countBy(slabs, (slab) => getCompany(slab.grade))).sort((a, b) => b[1] - a[1]);
  const eras = Object.entries(countBy(slabs, getEra)).sort((a, b) => b[1] - a[1]);
  const languages = Object.entries(countBy(slabs, getLanguage)).sort((a, b) => b[1] - a[1]);

  renderBreakdown(elements.gradingBreakdown, grading, total);
  renderBreakdown(elements.eraBreakdown, eras, total);
  renderBreakdown(elements.languageBreakdown, languages, total);

  const psa10 = slabs.filter((slab) => slab.grade.toUpperCase() === "PSA 10").length;
  const gradeQuality = total ? Math.round((psa10 / total) * 100) : 0;
  elements.healthBadge.textContent = gradeQuality >= 75 ? "A+" : "A";
  elements.portfolioHealth.textContent = `${gradeQuality}% PSA 10 concentration with ${grading.length} grading companies represented. Strong grail focus with room for more market-sourced price updates.`;
}

function renderAnalytics(slabs) {
  const totalPaid = slabs.reduce((sum, slab) => sum + slab.paidSGD, 0);
  const totalMarket = slabs.reduce((sum, slab) => sum + slab.marketSGD, 0);
  const totalGain = totalMarket - totalPaid;
  const gainPercent = totalPaid ? (totalGain / totalPaid) * 100 : 0;
  const vaulted = slabs.filter((slab) => slab.status === "Vaulted").length;
  const statusCounts = countBy(slabs, (slab) => slab.status);
  const sourceUpdated = slabs.filter((slab) => slab.marketSourceName === "PSA Estimate").length;

  elements.heroMarket.textContent = formatCurrency(totalMarket);
  elements.heroCount.textContent = String(slabs.length);
  elements.heroVaulted.textContent = String(vaulted);
  elements.totalPaid.textContent = formatCurrency(totalPaid);
  elements.totalMarket.textContent = formatCurrency(totalMarket);
  elements.totalGain.innerHTML = formatGain(totalGain);
  elements.totalGainPercent.innerHTML = formatPercent(gainPercent);
  elements.statusPills.innerHTML = Object.entries(statusCounts)
    .map(([status, count]) => {
      const statusClass = status.toLowerCase().replaceAll(" ", "-");
      return `<span class="status-pill ${statusClass}"><strong>${count}</strong> ${escapeHtml(status)}</span>`;
    })
    .join("");

  const byDate = [...slabs]
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
    .reduce((points, slab) => {
      const last = points.at(-1);
      const value = (last?.value || 0) + slab.marketSGD;
      if (last && last.date === slab.purchaseDate) last.value = value;
      else points.push({ date: slab.purchaseDate, value });
      return points;
    }, []);
  const max = Math.max(...byDate.map((point) => point.value), 1);
  elements.trendLine.innerHTML = byDate
    .map((point) => `<span style="height: ${(point.value / max) * 100}%" title="${escapeHtml(formatDate(point.date))}: ${escapeHtml(formatCurrency(point.value))}"></span>`)
    .join("");

  const gradeEntries = Object.entries(countBy(slabs, (slab) => slab.grade)).sort((a, b) => b[1] - a[1]);
  renderBreakdown(elements.gradeDistribution, gradeEntries, slabs.length);

  const eras = Object.keys(countBy(slabs, getEra)).length;
  const grades = Object.keys(countBy(slabs, (slab) => slab.grade)).length;
  const diversification = Math.min(99, Math.round(62 + eras * 6 + grades * 3));
  elements.diversificationScore.textContent = String(diversification);
  elements.diversificationText.textContent = `${eras} eras and ${grades} grade buckets represented. ${sourceUpdated} slab currently has external PSA Estimate pricing.`;
}

function renderProvenance(slabs) {
  const stories = [
    "A high-conviction grail entry anchoring the modern showcase tier.",
    "A collector-favorite Japanese chase piece with strong display presence.",
    "A premium acquisition kept visible for future market source upgrades.",
  ];

  elements.provenanceCards.innerHTML = topByMarket(slabs, 3)
    .map((slab, index) => `
      <article class="provenance-card">
        <span class="lot-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="provenance-image">${formatSlabImage(slab, "large")}</div>
        <div>
          <p>${escapeHtml(slab.grade)} · ${escapeHtml(slab.set)}</p>
          <h3>${escapeHtml(slab.card)}</h3>
          <h4>Acquisition story</h4>
          <p>${stories[index]}</p>
          <dl>
            <div><dt>Acquired</dt><dd>${escapeHtml(formatDate(slab.purchaseDate))}</dd></div>
            <div><dt>Cost</dt><dd>${formatCurrency(slab.paidSGD)}</dd></div>
          </dl>
        </div>
      </article>
    `)
    .join("");
}

function renderHistory(slabs) {
  const recent = [...slabs].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)).slice(0, 6);
  elements.recentAcquisitions.innerHTML = recent
    .map((slab) => `
      <article class="acquisition-row">
        <time datetime="${escapeHtml(slab.purchaseDate)}">${escapeHtml(formatDate(slab.purchaseDate))}</time>
        <div>
          <strong>${escapeHtml(slab.card)}</strong>
          <span>${escapeHtml(slab.grade)} · ${escapeHtml(slab.set)}</span>
        </div>
        <b>${formatCurrency(slab.marketSGD, slab.marketSGD > 999)}</b>
      </article>
    `)
    .join("");

  const timeline = recent.slice().reverse();
  elements.collectionTimeline.innerHTML = timeline
    .map((slab) => `
      <article>
        <time datetime="${escapeHtml(slab.purchaseDate)}">${escapeHtml(formatDate(slab.purchaseDate))}</time>
        <strong>${escapeHtml(slab.card)}</strong>
        <span>${escapeHtml(slab.grade)}</span>
      </article>
    `)
    .join("");

  const psa10 = slabs.filter((slab) => slab.grade.toUpperCase() === "PSA 10").length;
  const vaulted = slabs.filter((slab) => slab.status === "Vaulted").length;
  const highest = topByMarket(slabs, 1)[0];
  elements.milestones.innerHTML = [
    ["First major grail", highest.card, formatCurrency(highest.marketSGD, true)],
    ["Vault milestone", `${vaulted} slabs currently vaulted`, "Custody"],
    ["PSA quality marker", `${psa10} PSA 10 slabs`, "Grade"],
    ["Registry scale", `${slabs.length} documented slabs`, "Archive"],
  ]
    .map(([title, body, meta]) => `
      <article class="milestone">
        <span>${escapeHtml(meta)}</span>
        <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>
      </article>
    `)
    .join("");
}

function renderInsights(slabs) {
  const psa10 = slabs.filter((slab) => slab.grade.toUpperCase() === "PSA 10").length;
  const grails = slabs.filter((slab) => slab.marketSGD >= 300).length;
  const blackLabelCandidates = slabs.filter((slab) => /black|bwr|munch|poncho|van gogh/i.test(`${slab.card} ${slab.set}`)).length;

  elements.rarityStats.innerHTML = [
    ["PSA 10", psa10, "Investment-grade slab count"],
    ["Grails", grails, "Market value above S$300"],
    ["Signature themes", blackLabelCandidates, "Munch, Poncho, BWR, Van Gogh"],
  ]
    .map(([label, value, copy]) => `
      <div>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(copy)}</p>
      </div>
    `)
    .join("");

  elements.topPerformers.innerHTML = topByMarket(slabs, 4)
    .map((slab) => `
      <div class="performer-row">
        <span>${escapeHtml(slab.card)}</span>
        <strong>${formatCurrency(slab.marketSGD, slab.marketSGD > 999)}</strong>
      </div>
    `)
    .join("");
}

function renderTable(slabs) {
  if (!slabs.length) {
    elements.body.innerHTML = '<tr><td colspan="10" class="empty">No slabs match the current filters.</td></tr>';
    return;
  }

  elements.body.innerHTML = slabs
    .map((slab) => {
      const gain = slab.marketSGD - slab.paidSGD;
      const gainPercent = slab.paidSGD ? (gain / slab.paidSGD) * 100 : 0;
      const statusClass = slab.status.toLowerCase().replaceAll(" ", "-");
      const marketSource = slab.marketSourceUrl
        ? `<a href="${escapeHtml(slab.marketSourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(slab.marketSourceName || "Source")}</a>`
        : escapeHtml(slab.marketSourceName || "No source");

      return `
        <tr>
          <td class="date-cell" data-label="Purchase Date">${escapeHtml(slab.purchaseDate)}</td>
          <td class="slab-image-cell" data-label="Slab">${formatSlabImage(slab)}</td>
          <td class="card-name" data-label="Card">
            ${escapeHtml(slab.card)}
            <span class="subtle">${escapeHtml(slab.set)}</span>
          </td>
          <td data-label="Cert">${formatCert(slab)}</td>
          <td data-label="Grade">${escapeHtml(slab.grade)}</td>
          <td class="numeric" data-label="Paid SGD">${formatCurrency(slab.paidSGD)}</td>
          <td class="numeric" data-label="Market SGD">
            ${formatCurrency(slab.marketSGD)}
            <span class="subtle">${marketSource}${slab.marketDate ? ` | ${escapeHtml(slab.marketDate)}` : ""}</span>
          </td>
          <td class="numeric" data-label="Gain/Loss SGD">${formatGain(gain)}</td>
          <td class="numeric" data-label="Gain/Loss %">${formatPercent(gainPercent)}</td>
          <td data-label="Delivered/Vaulted"><span class="status ${statusClass}">${escapeHtml(slab.status)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderStaticSections() {
  const slabs = state.slabs;
  renderFeaturedGrails(slabs);
  renderOverview(slabs);
  renderAnalytics(slabs);
  renderProvenance(slabs);
  renderHistory(slabs);
  renderInsights(slabs);
}

function render() {
  renderTable(getFilteredSlabs());
}

async function loadSlabs() {
  try {
    const response = await fetch("data/slabs.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load slabs.json: ${response.status}`);

    const data = await response.json();
    state.slabs = data.slabs;
    elements.lastUpdated.textContent = `Updated ${data.lastUpdated}`;
    elements.analyticsDate.textContent = `As of ${data.lastUpdated}`;
    renderStaticSections();
    render();
  } catch (error) {
    elements.lastUpdated.textContent = "Data failed to load";
    elements.body.innerHTML = `<tr><td colspan="10" class="empty">${escapeHtml(error.message)}</td></tr>`;
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

loadSlabs();
