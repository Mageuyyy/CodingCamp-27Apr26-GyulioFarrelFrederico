// Expense Tracker — app.js
// Entry point: all app logic lives here.
// Linked from index.html as a deferred script.

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier (crypto.randomUUID())
 * @property {string} name      - Item name, non-empty after trim
 * @property {number} amount    - Positive finite number
 * @property {string} category  - Category label
 * @property {string} date      - ISO date string (YYYY-MM-DD) of when added
 */

// ---------------------------------------------------------------------------
// Currency Helper
// ---------------------------------------------------------------------------

function formatIDR(value) {
  return value.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Storage Module
// ---------------------------------------------------------------------------

const STORAGE_KEY_TRANSACTIONS = "expense-tracker-transactions";
const STORAGE_KEY_CATEGORIES   = "expense-tracker-categories";
const STORAGE_KEY_LIMIT        = "expense-tracker-spending-limit";
const STORAGE_KEY_THEME        = "expense-tracker-theme";
const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

const storage = {
  save(transactions) {
    try { localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions)); }
    catch (err) { console.warn("[expense-tracker] Could not save transactions:", err); }
  },
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      return raw ? JSON.parse(raw) : [];
    } catch (err) { return []; }
  },
  saveCategories(categories) {
    try { localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories)); }
    catch (err) { console.warn("[expense-tracker] Could not save categories:", err); }
  },
  loadCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      return raw ? JSON.parse(raw) : [...DEFAULT_CATEGORIES];
    } catch (err) { return [...DEFAULT_CATEGORIES]; }
  },
  saveLimit(limit) {
    try { localStorage.setItem(STORAGE_KEY_LIMIT, JSON.stringify(limit)); }
    catch (err) { console.warn("[expense-tracker] Could not save limit:", err); }
  },
  loadLimit() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIMIT);
      return raw ? JSON.parse(raw) : 0;
    } catch (err) { return 0; }
  },
  saveTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(theme)); }
    catch (err) { console.warn("[expense-tracker] Could not save theme:", err); }
  },
  loadTheme() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_THEME);
      if (raw) return JSON.parse(raw);
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (err) { return "dark"; }
  },
};

// ---------------------------------------------------------------------------
// In-Memory State
// ---------------------------------------------------------------------------

let transactions = [];
let categories   = [];
let spendingLimit = 0;
let theme = "dark";
let chartInstance = null;
let sortMode = "date";

// ---------------------------------------------------------------------------
// Animation Helpers
// ---------------------------------------------------------------------------

/**
 * Animates a counter from its current displayed value to a target number.
 * Uses requestAnimationFrame for 60fps smoothness with no layout thrash.
 *
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} [duration=450]
 */
function animateCounter(el, target, duration = 450) {
  const start = parseFloat(el.dataset.rawValue || "0");
  el.dataset.rawValue = target;

  if (start === target) return;

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = formatIDR(Math.round(current));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * Slides a new list item in from the top with a fade.
 * Uses the Web Animations API (zero extra CSS needed).
 *
 * @param {HTMLElement} el
 */
function animateIn(el) {
  el.animate(
    [
      { opacity: 0, transform: "translateY(-8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 220, easing: "ease-out", fill: "forwards" }
  );
}

/**
 * Slides an element out before removal.
 * Returns a Promise that resolves when the animation finishes.
 *
 * @param {HTMLElement} el
 * @returns {Promise<void>}
 */
function animateOut(el) {
  return el.animate(
    [
      { opacity: 1, transform: "translateX(0)",    maxHeight: el.scrollHeight + "px" },
      { opacity: 0, transform: "translateX(24px)", maxHeight: "0px" },
    ],
    { duration: 200, easing: "ease-in", fill: "forwards" }
  ).finished;
}

/**
 * Shows a brief success pulse on a button.
 *
 * @param {HTMLElement} btn
 * @param {string} [label="✓ Ditambahkan"]
 */
function flashSuccess(btn, label = "✓ Ditambahkan") {
  const original = btn.textContent;
  btn.textContent = label;
  btn.style.background = "linear-gradient(135deg, #059669, #10b981)";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.style.background = "";
    btn.disabled = false;
  }, 900);
}

/**
 * Shakes an element to signal a validation error.
 *
 * @param {HTMLElement} el
 */
function shakeElement(el) {
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 320, easing: "ease-out" }
  );
}

// ---------------------------------------------------------------------------
// Category Color Palette
// ---------------------------------------------------------------------------

const BUILTIN_COLORS = { Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" };

function categoryColor(category) {
  if (BUILTIN_COLORS[category]) return BUILTIN_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) & 0xffffffff;
  }
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate({ name, amount, category }) {
  const errors = {};
  if (!name || name.trim() === "") errors.name = "Nama item wajib diisi.";
  const parsed = parseFloat(amount);
  if (!isFinite(parsed) || parsed <= 0) errors.amount = "Jumlah harus berupa angka positif.";
  if (!categories.includes(category)) errors.category = "Pilih kategori yang valid.";
  return Object.keys(errors).length === 0 ? null : errors;
}

// ---------------------------------------------------------------------------
// Sorting Helper
// ---------------------------------------------------------------------------

function getSorted(txns) {
  const copy = [...txns];
  switch (sortMode) {
    case "amount-asc":  return copy.sort((a, b) => a.amount - b.amount);
    case "amount-desc": return copy.sort((a, b) => b.amount - a.amount);
    case "category":    return copy.sort((a, b) => a.category.localeCompare(b.category));
    default:            return copy.reverse(); // newest first
  }
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

/**
 * Updates the balance with an animated counter.
 * Only animates when the value actually changes to avoid wasted frames.
 */
function renderBalance(txns) {
  const el = document.getElementById("balance-amount");
  const sum = txns.reduce((acc, t) => acc + t.amount, 0);
  animateCounter(el, sum);
}

/**
 * Rebuilds the full list. New items get a slide-in animation.
 * A Set of existing IDs avoids re-animating unchanged rows.
 */
function renderList(txns) {
  const list = document.getElementById("transaction-list");

  if (txns.length === 0) {
    list.innerHTML = "";
    const li = document.createElement("li");
    li.className = "placeholder-message";
    li.textContent = "Belum ada transaksi.";
    animateIn(li);
    list.appendChild(li);
    return;
  }

  // Track which IDs are already rendered so we only animate truly new items
  const existingIds = new Set(
    [...list.querySelectorAll("li[data-id]")].map(el => el.dataset.id)
  );

  const sorted = getSorted(txns);

  list.innerHTML = "";

  for (const t of sorted) {
    const li = document.createElement("li");
    li.dataset.id = t.id;

    const nameSpan = document.createElement("span");
    nameSpan.className = "transaction-name";
    nameSpan.textContent = t.name;

    const amountSpan = document.createElement("span");
    amountSpan.className = "transaction-amount";
    amountSpan.textContent = formatIDR(t.amount);

    const categorySpan = document.createElement("span");
    categorySpan.className = "transaction-category";
    categorySpan.textContent = t.category;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.id = t.id;
    deleteBtn.textContent = "Hapus";
    deleteBtn.setAttribute("aria-label", `Hapus ${t.name}`);

    const overLimit = spendingLimit > 0 && t.amount > spendingLimit;
    if (overLimit) {
      li.classList.add("transaction-over-limit");
    }

    li.append(nameSpan, amountSpan, categorySpan);

    if (overLimit) {
      const warningBadge = document.createElement("span");
      warningBadge.className = "over-limit-pill";
      warningBadge.textContent = "Lebih batas";
      li.appendChild(warningBadge);
    }

    li.appendChild(deleteBtn);
    list.appendChild(li);

    // Only animate items that weren't already visible
    if (!existingIds.has(t.id)) animateIn(li);
  }
}

/**
 * Updates the chart. Destroyed and recreated only when the category set
 * or data changes — avoids flicker on sort-only re-renders.
 */
function renderChart(txns) {
  const canvas = document.getElementById("spending-chart");
  const placeholder = document.getElementById("chart-placeholder");

  if (!window.Chart) {
    placeholder.textContent = "Grafik tidak tersedia — periksa koneksi internet Anda.";
    placeholder.style.display = "";
    canvas.style.display = "none";
    return;
  }

  if (txns.length === 0) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    placeholder.style.display = "";
    canvas.style.display = "none";
    return;
  }

  const totals = {};
  for (const t of txns) totals[t.category] = (totals[t.category] || 0) + t.amount;

  const labels = Object.keys(totals);
  const data   = labels.map(c => totals[c]);
  const colors = labels.map(c => categoryColor(c));

  placeholder.style.display = "none";
  canvas.style.display = "";

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new window.Chart(canvas, {
    type: "pie",
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: {
      animation: { duration: 500, easing: "easeOutQuart" },
      plugins: {
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${formatIDR(ctx.parsed)}` },
        },
      },
    },
  });
}

/**
 * Renders the monthly summary table.
 */
function renderMonthlySummary(txns) {
  const container = document.getElementById("monthly-summary-body");
  container.innerHTML = "";

  if (txns.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "placeholder-message";
    cell.textContent = "Belum ada data.";
    row.appendChild(cell);
    container.appendChild(row);
    return;
  }

  const byMonth = {};
  for (const t of txns) {
    const month = (t.date || "").slice(0, 7) || "Tidak diketahui";
    if (!byMonth[month]) byMonth[month] = { total: 0, byCategory: {} };
    byMonth[month].total += t.amount;
    byMonth[month].byCategory[t.category] = (byMonth[month].byCategory[t.category] || 0) + t.amount;
  }

  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  for (const month of months) {
    const { total, byCategory } = byMonth[month];
    const row = document.createElement("tr");
    row.className = "summary-month-row";

    const monthCell = document.createElement("td");
    monthCell.textContent = formatMonthLabel(month);

    const totalCell = document.createElement("td");
    totalCell.className = "summary-amount";
    totalCell.textContent = formatIDR(total);

    const detailCell = document.createElement("td");
    detailCell.className = "summary-detail";
    detailCell.textContent = Object.entries(byCategory)
      .map(([cat, amt]) => `${cat}: ${formatIDR(amt)}`)
      .join(" · ");

    row.append(monthCell, totalCell, detailCell);
    container.appendChild(row);
  }
}

/**
 * Rebuilds the category dropdown. Preserves selected value when possible.
 */
function renderCategorySelect() {
  const select = document.getElementById("item-category");
  const current = select.value;
  select.innerHTML = '<option value="">-- Pilih kategori --</option>';
  for (const cat of categories) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }
  if (categories.includes(current)) select.value = current;
}

/**
 * Rebuilds the category pill list.
 */
function renderCategoryManager() {
  const list = document.getElementById("category-list");
  list.innerHTML = "";
  for (const cat of categories) {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = cat;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-category-btn";
    removeBtn.dataset.category = cat;
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", `Hapus kategori ${cat}`);
    if (transactions.some(t => t.category === cat)) {
      removeBtn.disabled = true;
      removeBtn.title = "Kategori ini masih digunakan oleh transaksi.";
    }

    li.append(nameSpan, removeBtn);
    list.appendChild(li);
  }
}

function renderLimitStatus() {
  const input = document.getElementById("limit-amount");
  const status = document.getElementById("limit-status");
  if (!input || !status) return;

  input.value = spendingLimit > 0 ? spendingLimit : "";

  const addBtn = document.getElementById("add-btn");
  if (spendingLimit <= 0) {
    status.textContent = "Atur batas untuk menyoroti transaksi besar.";
    status.className = "limit-status";
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.title = "";
    }
    return;
  }

  const total = transactions.reduce((sum, txn) => sum + txn.amount, 0);
  const isAtOrOverLimit = total >= spendingLimit;

  if (isAtOrOverLimit) {
    status.textContent = `Batas ${formatIDR(spendingLimit)} sudah tercapai. Tidak dapat menambahkan transaksi baru.`;
    status.className = "limit-status limit-status--alert";
  } else {
    status.textContent = `Batas saat ini ${formatIDR(spendingLimit)}. Transaksi di atas ini akan disorot.`;
    status.className = "limit-status";
  }

  if (addBtn) {
    addBtn.disabled = isAtOrOverLimit;
    addBtn.title = isAtOrOverLimit ? "Anda telah mencapai batas pengeluaran." : "";
  }
}

function handleLimitInput(event) {
  const value = parseFloat(event.target.value);
  spendingLimit = Number.isFinite(value) && value > 0 ? value : 0;
  storage.saveLimit(spendingLimit);
  render();
}

function applyTheme() {
  document.body.classList.toggle("light-mode", theme === "light");
  const button = document.getElementById("theme-toggle");
  if (button) {
    button.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }
}

function handleThemeToggle() {
  theme = theme === "dark" ? "light" : "dark";
  storage.saveTheme(theme);
  applyTheme();
}

// ---------------------------------------------------------------------------
// Top-level render — split into "full" and "list-only" paths
// ---------------------------------------------------------------------------

/**
 * Full UI refresh — call after any state mutation that affects everything.
 */
function render() {
  renderBalance(transactions);
  renderList(transactions);
  renderChart(transactions);
  renderMonthlySummary(transactions);
  renderCategorySelect();
  renderCategoryManager();
  renderLimitStatus();
}

/**
 * Lightweight re-render for sort changes — only updates the list.
 * Avoids destroying/recreating the chart or re-building the category UI.
 */
function renderListOnly() {
  renderList(transactions);
}

// ---------------------------------------------------------------------------
// App Controller — Event Handlers
// ---------------------------------------------------------------------------

function handleAdd(event) {
  event.preventDefault();

  const nameEl     = document.getElementById("item-name");
  const amountEl   = document.getElementById("item-amount");
  const categoryEl = document.getElementById("item-category");
  const addBtn     = document.getElementById("add-btn");

  const name     = nameEl.value;
  const amount   = amountEl.value;
  const category = categoryEl.value;

  // Clear previous errors
  document.getElementById("name-error").textContent     = "";
  document.getElementById("amount-error").textContent   = "";
  document.getElementById("category-error").textContent = "";

  const errors = validate({ name, amount, category });
  if (errors) {
    // Surface errors and shake the first offending field
    const firstErrorField = errors.name ? nameEl : errors.amount ? amountEl : categoryEl;
    if (errors.name)     document.getElementById("name-error").textContent     = errors.name;
    if (errors.amount)   document.getElementById("amount-error").textContent   = errors.amount;
    if (errors.category) document.getElementById("category-error").textContent = errors.category;
    shakeElement(firstErrorField);
    firstErrorField.focus();
    return;
  }

  const currentTotal = transactions.reduce((sum, txn) => sum + txn.amount, 0);
  if (spendingLimit > 0 && currentTotal >= spendingLimit) {
    const status = document.getElementById("limit-status");
    status.textContent = `Batas ${formatIDR(spendingLimit)} sudah tercapai. Tidak dapat menambahkan transaksi baru.`;
    status.className = "limit-status limit-status--alert";
    shakeElement(addBtn);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  transactions.push({
    id: crypto.randomUUID(),
    name: name.trim(),
    amount: parseFloat(amount),
    category,
    date: today,
  });

  storage.save(transactions);

  // Optimistic UI: animate the button before the render cycle
  flashSuccess(addBtn);
  render();

  // Reset only value fields, leave category selected for quick repeat entry
  nameEl.value   = "";
  amountEl.value = "";
  const amountPreview = document.getElementById("amount-preview");
  if (amountPreview) amountPreview.style.display = "none";
  nameEl.focus();
}

/**
 * Animates an item out then removes it from state — prevents janky instant removal.
 */
async function handleDelete(id) {
  const li = document.querySelector(`#transaction-list li[data-id="${id}"]`);

  if (li) {
    // Disable the button immediately to prevent double-clicks
    const btn = li.querySelector(".delete-btn");
    if (btn) btn.disabled = true;
    await animateOut(li);
  }

  transactions = transactions.filter(t => t.id !== id);
  storage.save(transactions);
  render();
}

function handleAddCategory(event) {
  event.preventDefault();

  const input = document.getElementById("new-category-input");
  const name  = input.value.trim();
  const err   = document.getElementById("new-category-error");
  err.textContent = "";

  if (!name) {
    err.textContent = "Nama kategori tidak boleh kosong.";
    shakeElement(input);
    input.focus();
    return;
  }
  if (categories.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
    err.textContent = "Kategori sudah ada.";
    shakeElement(input);
    return;
  }

  categories.push(name);
  storage.saveCategories(categories);
  input.value = "";
  render();
}

async function handleRemoveCategory(categoryName) {
  if (transactions.some(t => t.category === categoryName)) return;

  // Animate the pill out before removing
  const btn = document.querySelector(`.remove-category-btn[data-category="${CSS.escape(categoryName)}"]`);
  if (btn) {
    const pill = btn.closest("li");
    if (pill) await animateOut(pill);
  }

  categories = categories.filter(c => c !== categoryName);
  storage.saveCategories(categories);
  render();
}

/**
 * Updates sort mode. Uses the lightweight list-only render path.
 */
function handleSort(mode) {
  sortMode = mode;
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.classList.toggle("sort-btn--active", btn.dataset.sort === mode);
  });
  renderListOnly();
}

// ---------------------------------------------------------------------------
// Input UX Enhancements
// ---------------------------------------------------------------------------

/**
 * Shows a formatted IDR preview below the amount field as the user types.
 * The input stays type="number" at all times so the raw numeric value is
 * never corrupted by locale-formatted strings (e.g. "250.000" → 250).
 */
function setupAmountFieldFormatting() {
  const amountEl = document.getElementById("item-amount");

  // Create a small preview element and insert it right after the input
  const preview = document.createElement("span");
  preview.id = "amount-preview";
  preview.style.cssText = [
    "font-size:0.78rem",
    "color:rgba(255,255,255,0.45)",
    "margin-top:0.2rem",
    "display:none",
    "letter-spacing:0.01em",
  ].join(";");
  amountEl.insertAdjacentElement("afterend", preview);

  amountEl.addEventListener("input", () => {
    const val = parseFloat(amountEl.value);
    if (isFinite(val) && val > 0) {
      preview.textContent = formatIDR(val);
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });

  // Hide preview on blur if the field is empty
  amountEl.addEventListener("blur", () => {
    if (!amountEl.value) preview.style.display = "none";
  });
}

/**
 * Clears field-level error messages as soon as the user starts typing,
 * so stale errors don't linger.
 */
function setupInlineErrorClear() {
  [
    ["item-name",     "name-error"],
    ["item-amount",   "amount-error"],
    ["item-category", "category-error"],
  ].forEach(([fieldId, errorId]) => {
    document.getElementById(fieldId)
      .addEventListener("input", () => {
        document.getElementById(errorId).textContent = "";
      });
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatMonthLabel(ym) {
  if (!ym || ym === "Tidak diketahui") return ym;
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString("id-ID", { month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function init() {
  transactions = storage.load();
  categories   = storage.loadCategories();
  spendingLimit = storage.loadLimit();
  theme = storage.loadTheme();

  // Form: add transaction
  document.getElementById("transaction-form")
    .addEventListener("submit", handleAdd);

  // List: delete via event delegation
  document.getElementById("transaction-list")
    .addEventListener("click", (event) => {
      const btn = event.target.closest(".delete-btn[data-id]");
      if (btn) handleDelete(btn.dataset.id);
    });

  // Category manager: add category
  document.getElementById("add-category-form")
    .addEventListener("submit", handleAddCategory);

  // Category manager: remove via event delegation
  document.getElementById("category-list")
    .addEventListener("click", (event) => {
      const btn = event.target.closest(".remove-category-btn[data-category]");
      if (btn && !btn.disabled) handleRemoveCategory(btn.dataset.category);
    });

  // Sort buttons
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.addEventListener("click", () => handleSort(btn.dataset.sort));
  });

  // UX enhancements
  setupAmountFieldFormatting();
  setupInlineErrorClear();
  document.getElementById("limit-amount")
    .addEventListener("input", handleLimitInput);
  document.getElementById("theme-toggle")
    .addEventListener("click", handleThemeToggle);

  applyTheme();

  // Initial render
  render();

  // Mark the default active sort button
  const defaultSortBtn = document.querySelector(`.sort-btn[data-sort="${sortMode}"]`);
  if (defaultSortBtn) defaultSortBtn.classList.add("sort-btn--active");
}

document.addEventListener("DOMContentLoaded", init);