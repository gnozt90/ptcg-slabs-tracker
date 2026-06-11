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

const percentFormatter = new Intl.NumberFormat("en-SG", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const elements = {
  body: document.querySelector("#slabsBody"),
  totalPaid: document.querySelector("#totalPaid"),
  totalMarket: document.querySelector("#totalMarket"),
  totalGain: document.querySelector("#totalGain"),
  cardCount: document.querySelector("#cardCount"),
  lastUpdated: document.querySelector("#lastUpdated"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
};

function formatCurrency(value) {
  if (typeof value !== "number") return "-";
  return currencyFormatter.format(value);
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

function getFilteredSlabs() {
  const query = state.query.trim().toLowerCase();

  return state.slabs.filter((slab) => {
    const statusMatches = state.status === "all" || slab.status === state.status;
    const searchable = [
      slab.card,
      slab.cert,
      slab.grade,
      slab.set,
      slab.marketSourceName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return statusMatches && (!query || searchable.includes(query));
  });
}

function renderSummary(slabs) {
  const totalPaid = slabs.reduce((sum, slab) => sum + slab.paidSGD, 0);
  const totalMarket = slabs.reduce((sum, slab) => sum + slab.marketSGD, 0);
  const totalGain = totalMarket - totalPaid;

  elements.totalPaid.textContent = formatCurrency(totalPaid);
  elements.totalMarket.textContent = formatCurrency(totalMarket);
  elements.totalGain.innerHTML = formatGain(totalGain);
  elements.cardCount.textContent = String(slabs.length);
}

function renderTable(slabs) {
  if (!slabs.length) {
    elements.body.innerHTML = '<tr><td colspan="9" class="empty">No slabs match the current filters.</td></tr>';
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
          <td class="date-cell">${escapeHtml(slab.purchaseDate)}</td>
          <td class="card-name">
            ${escapeHtml(slab.card)}
            <span class="subtle">${escapeHtml(slab.set)}</span>
          </td>
          <td>${escapeHtml(slab.cert)}</td>
          <td>${escapeHtml(slab.grade)}</td>
          <td class="numeric">${formatCurrency(slab.paidSGD)}</td>
          <td class="numeric">
            ${formatCurrency(slab.marketSGD)}
            <span class="subtle">${marketSource}${slab.marketDate ? ` | ${escapeHtml(slab.marketDate)}` : ""}</span>
          </td>
          <td class="numeric">${formatGain(gain)}</td>
          <td class="numeric">${formatPercent(gainPercent)}</td>
          <td><span class="status ${statusClass}">${escapeHtml(slab.status)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  const filteredSlabs = getFilteredSlabs();
  renderSummary(filteredSlabs);
  renderTable(filteredSlabs);
}

async function loadSlabs() {
  try {
    const response = await fetch("data/slabs.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load slabs.json: ${response.status}`);

    const data = await response.json();
    state.slabs = data.slabs;
    elements.lastUpdated.textContent = `Updated ${data.lastUpdated}`;
    render();
  } catch (error) {
    elements.lastUpdated.textContent = "Data failed to load";
    elements.body.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(error.message)}</td></tr>`;
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
