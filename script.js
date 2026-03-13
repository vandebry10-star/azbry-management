/* ══════════════════════════════════════
   AZBRY FINANCE — script.js
   Supabase + Charts + Privacy + Export
══════════════════════════════════════ */

/* ── CONFIG SUPABASE ── */
const SUPABASE_URL = "https://jojjjsiiusweqevvgyck.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvampqc2lpdXN3ZXFldnZneWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTAyMTIsImV4cCI6MjA3ODY4NjIxMn0.7grSI_mkaF9U4FB0XMZ7iyCtizm5LTXMcNNE7WOu7Bg";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── STATE ── */
let allData = [];
let currentType = "income";
let privacyOn = localStorage.getItem("privacy") === "1";
let miniChartInst = null;
let donutChartInst = null;
let barChartInst = null;
let pendingDeleteId = null;
let pendingDeleteAll = false;
let currentPage = "dashboard";

/* ── FORMAT RUPIAH ── */
function fmt(n) {
  return "Rp\u00a0" + (n || 0).toLocaleString("id-ID");
}

/* ── TOAST ── */
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast" + (isError ? " error" : "");
  void t.offsetWidth;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

/* ── PRIVACY ── */
function applyPrivacy() {
  document.body.classList.toggle("privacy-on", privacyOn);
  const icon = privacyOn ? "🙈" : "👁";
  ["privacyIcon", "privacyIconMobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = icon;
  });
}

window.togglePrivacy = function () {
  privacyOn = !privacyOn;
  localStorage.setItem("privacy", privacyOn ? "1" : "0");
  applyPrivacy();
};

/* ── CLOCK ── */
function startClock() {
  const update = () => {
    const now = new Date();
    const d = document.getElementById("headerDate");
    const c = document.getElementById("clockDisplay");
    if (d) d.textContent = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    if (c) c.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  update();
  setInterval(update, 1000);
}

/* ── GREETING ── */
function setGreeting() {
  const h = new Date().getHours();
  const el = document.getElementById("greetingText");
  if (!el) return;
  if (h < 11) el.textContent = "Selamat pagi 🌤";
  else if (h < 15) el.textContent = "Selamat siang ☀️";
  else if (h < 18) el.textContent = "Selamat sore 🌇";
  else el.textContent = "Selamat malam 🌙";
}

/* ── PAGE NAVIGATION ── */
window.switchPage = function (page) {
  currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item, .bnav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === page);
  });
  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");

  if (page === "analitik") renderAnalitik();
};

/* ── LOAD DATA ── */
async function loadData() {
  const { data, error } = await db
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (error) { console.error(error); return; }
  allData = data || [];

  renderDashboard();
  applyFilter();
  populateMonthFilter();
  if (currentPage === "analitik") renderAnalitik();
}

/* ── DASHBOARD ── */
function renderDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const todayRows = allData.filter(t => t.date === today);

  let income = 0, expense = 0;
  allData.forEach(t => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  const saldo = income - expense;

  setEl("saldoValue", fmt(saldo));
  setEl("totalIncome", fmt(income));
  setEl("totalExpense", fmt(expense));
  setEl("statTxnCount", allData.length);
  setEl("statTodayCount", todayRows.length);

  const cats = [...new Set(allData.map(t => t.category).filter(Boolean))];
  setEl("statCatCount", cats.length);

  setEl("todayCount", todayRows.length + " transaksi");

  renderTodayList(todayRows);
  renderMiniChart();
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderTodayList(rows) {
  const el = document.getElementById("todayList");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<div class="empty-state">Belum ada transaksi hari ini</div>';
    return;
  }
  el.innerHTML = rows.map(t => txnItemHTML(t, false)).join("");
}

function txnItemHTML(t, showDate = true) {
  const isIncome = t.type === "income";
  return `
    <div class="txn-item">
      <span class="txn-dot ${isIncome ? "income" : "expense"}"></span>
      <div class="txn-info">
        <div class="txn-cat">${t.category || (isIncome ? "Pemasukan" : "Pengeluaran")}</div>
        ${t.note ? `<div class="txn-note">${t.note}</div>` : ""}
      </div>
      <div class="txn-right">
        <div class="txn-amount ${isIncome ? "green" : "red"}">${isIncome ? "+" : "-"}${fmt(t.amount)}</div>
        ${showDate ? `<div class="txn-date">${t.date}</div>` : ""}
      </div>
      <button class="txn-del" onclick="confirmDelete(${t.id})">✕</button>
    </div>`;
}

/* ── MINI CHART (7 hari) ── */
function renderMiniChart() {
  const canvas = document.getElementById("miniChart");
  if (!canvas) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  const incomes = days.map(d => allData.filter(t => t.date === d && t.type === "income").reduce((s, t) => s + t.amount, 0));
  const expenses = days.map(d => allData.filter(t => t.date === d && t.type === "expense").reduce((s, t) => s + t.amount, 0));
  const labels = days.map(d => new Date(d).toLocaleDateString("id-ID", { weekday: "short" }));

  if (miniChartInst) miniChartInst.destroy();

  miniChartInst = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Masuk", data: incomes, borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.08)", tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: "#34d399" },
        { label: "Keluar", data: expenses, borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.06)", tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: "#f87171" }
      ]
    },
    options: chartOpts("compact")
  });
}

/* ── ANALITIK ── */
function renderAnalitik() {
  let income = 0, expense = 0;
  allData.forEach(t => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });
  setEl("aTotalIncome", fmt(income));
  setEl("aTotalExpense", fmt(expense));

  renderDonut();
  renderBarChart();
  renderTopExpenses();
}

function renderDonut() {
  const canvas = document.getElementById("donutChart");
  if (!canvas) return;

  const catMap = {};
  allData.filter(t => t.type === "expense" && t.category).forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const labels = sorted.map(([k]) => k);
  const vals = sorted.map(([, v]) => v);
  const colors = ["#34d399","#60a5fa","#fbbf24","#a78bfa","#f87171","#34d4d4","#f0abfc","#fb923c"];

  if (donutChartInst) donutChartInst.destroy();

  if (!sorted.length) {
    const legend = document.getElementById("categoryLegend");
    if (legend) legend.innerHTML = '<span style="color:var(--text-dimmer);font-size:12px">Belum ada data pengeluaran</span>';
    return;
  }

  donutChartInst = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverBorderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` },
          backgroundColor: "#1c1f2a", titleColor: "#94a3b8", bodyColor: "#e2e8f0", borderColor: "#2a2d3a", borderWidth: 1
        }
      }
    }
  });

  const legend = document.getElementById("categoryLegend");
  if (legend) {
    legend.innerHTML = sorted.map(([k, v], i) => `
      <div class="cat-legend-item">
        <span class="cat-dot" style="background:${colors[i % colors.length]}"></span>
        <span>${k}</span>
      </div>`).join("");
  }
}

function renderBarChart() {
  const canvas = document.getElementById("barChart");
  if (!canvas) return;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const incomes = months.map(m => allData.filter(t => t.date.startsWith(m) && t.type === "income").reduce((s, t) => s + t.amount, 0));
  const expenses = months.map(m => allData.filter(t => t.date.startsWith(m) && t.type === "expense").reduce((s, t) => s + t.amount, 0));
  const labels = months.map(m => { const [y, mo] = m.split("-"); return new Date(y, mo - 1).toLocaleDateString("id-ID", { month: "short" }); });

  if (barChartInst) barChartInst.destroy();

  barChartInst = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Masuk", data: incomes, backgroundColor: "rgba(52,211,153,0.7)", borderRadius: 6 },
        { label: "Keluar", data: expenses, backgroundColor: "rgba(248,113,113,0.6)", borderRadius: 6 }
      ]
    },
    options: chartOpts("bar")
  });
}

function renderTopExpenses() {
  const el = document.getElementById("topExpenses");
  if (!el) return;

  const catMap = {};
  allData.filter(t => t.type === "expense" && t.category).forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = sorted[0]?.[1] || 1;

  if (!sorted.length) {
    el.innerHTML = '<div class="empty-state">Belum ada data</div>';
    return;
  }

  el.innerHTML = sorted.map(([cat, val], i) => `
    <div class="top-item">
      <span class="top-rank">${i + 1}</span>
      <div class="top-bar-wrap">
        <div class="top-cat">${cat}</div>
        <div class="top-bar-bg">
          <div class="top-bar-fill" style="width:${(val / max * 100).toFixed(1)}%"></div>
        </div>
      </div>
      <span class="top-amount">${fmt(val)}</span>
    </div>`).join("");
}

/* ── CHART OPTIONS ── */
function chartOpts(type) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1c1f2a",
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        borderColor: "#2a2d3a",
        borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` }
      }
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#475569", font: { size: 11 } } },
      y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#475569", font: { size: 11 }, callback: v => v >= 1e6 ? (v / 1e6).toFixed(1) + "jt" : v >= 1e3 ? (v / 1e3).toFixed(0) + "rb" : v } }
    }
  };

  if (type === "compact") {
    base.scales.x.ticks.font.size = 10;
    base.scales.y.ticks.font.size = 10;
  }

  return base;
}

/* ── RIWAYAT / FILTER ── */
function populateMonthFilter() {
  const sel = document.getElementById("filterMonth");
  if (!sel) return;

  const months = [...new Set(allData.map(t => t.date.slice(0, 7)))].sort().reverse();
  const current = sel.value;
  sel.innerHTML = '<option value="all">Semua bulan</option>';
  months.forEach(m => {
    const [y, mo] = m.split("-");
    const label = new Date(y, mo - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    sel.innerHTML += `<option value="${m}">${label}</option>`;
  });
  sel.value = current || "all";
}

window.applyFilter = function () {
  const type = document.getElementById("filterType")?.value || "all";
  const month = document.getElementById("filterMonth")?.value || "all";
  const search = (document.getElementById("filterSearch")?.value || "").toLowerCase();

  let rows = allData;
  if (type !== "all") rows = rows.filter(t => t.type === type);
  if (month !== "all") rows = rows.filter(t => t.date.startsWith(month));
  if (search) rows = rows.filter(t =>
    (t.category || "").toLowerCase().includes(search) ||
    (t.note || "").toLowerCase().includes(search) ||
    String(t.amount).includes(search)
  );

  const el = document.getElementById("historyList");
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = '<div class="empty-state">Tidak ada transaksi ditemukan</div>';
    return;
  }

  el.innerHTML = rows.map(t => txnItemHTML(t, true)).join("");
};

/* ── FORM ── */
window.setType = function (type) {
  currentType = type;
  document.querySelectorAll(".type-btn").forEach(b => b.classList.toggle("active", b.dataset.type === type));
};

window.pickCat = function (btn) {
  const txt = btn.textContent.replace(/[\u{1F000}-\u{1FFFF}]/gu, "").replace(/[^\w\s]/g, "").trim();
  const input = document.getElementById("categoryInput");
  if (input) input.value = txt;
  document.querySelectorAll(".qcat").forEach(q => q.classList.remove("selected"));
  btn.classList.add("selected");
};

async function handleFormSubmit(e) {
  e.preventDefault();

  const date = document.getElementById("dateInput").value;
  const amountInput = document.getElementById("amountInput");
  const raw = amountInput.dataset.raw || amountInput.value.replace(/\D/g, "");
  const amount = Number(raw) || 0;
  const category = document.getElementById("categoryInput")?.value?.trim() || "";
  const note = document.getElementById("noteInput")?.value?.trim() || "";

  if (!date || !amount) {
    showToast("Tanggal & nominal wajib diisi", true);
    return;
  }

  const btn = document.getElementById("submitBtn");
  if (btn) { btn.disabled = true; btn.querySelector(".btn-text").style.display = "none"; btn.querySelector(".btn-loader").style.display = "inline"; }

  const { error } = await db.from("transactions").insert([{ date, type: currentType, amount, category, note }]);

  if (btn) { btn.disabled = false; btn.querySelector(".btn-text").style.display = "inline"; btn.querySelector(".btn-loader").style.display = "none"; }

  if (error) { showToast("Gagal menyimpan", true); return; }

  document.getElementById("transactionForm").reset();
  document.getElementById("dateInput").value = date;
  document.querySelectorAll(".qcat").forEach(q => q.classList.remove("selected"));

  showToast("✓ Transaksi tersimpan!");
  await loadData();
  switchPage("dashboard");
}

/* ── DELETE ── */
window.confirmDelete = function (id) {
  pendingDeleteId = id;
  pendingDeleteAll = false;
  document.getElementById("confirmText").textContent = "Hapus transaksi ini?";
  document.getElementById("confirmModal").style.display = "flex";
  document.getElementById("confirmOkBtn").onclick = executeDelete;
};

async function executeDelete() {
  closeConfirm();
  if (pendingDeleteAll) {
    const { error } = await db.from("transactions").delete().neq("id", 0);
    if (error) { showToast("Gagal reset", true); return; }
    showToast("Semua data direset");
  } else {
    const { error } = await db.from("transactions").delete().eq("id", pendingDeleteId);
    if (error) { showToast("Gagal hapus", true); return; }
    showToast("Transaksi dihapus");
  }
  await loadData();
}

window.resetRiwayat = function () {
  pendingDeleteAll = true;
  pendingDeleteId = null;
  document.getElementById("confirmText").textContent = "Yakin hapus SEMUA data transaksi?";
  document.getElementById("confirmModal").style.display = "flex";
  document.getElementById("confirmOkBtn").onclick = executeDelete;
};

window.closeConfirm = function () {
  document.getElementById("confirmModal").style.display = "none";
};

/* ── EXPORT CSV ── */
window.exportCSV = function () {
  if (!allData.length) { showToast("Tidak ada data untuk diexport", true); return; }
  const header = "Tanggal,Jenis,Kategori,Catatan,Nominal";
  const rows = allData.map(t =>
    `${t.date},${t.type === "income" ? "Masuk" : "Keluar"},${t.category || ""},${(t.note || "").replace(/,/g, ";")},${t.amount}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "azbry-finance-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast("✓ CSV didownload!");
};

/* ── AMOUNT FORMAT ── */
function setupAmountInput() {
  const input = document.getElementById("amountInput");
  if (!input) return;
  input.addEventListener("input", () => {
    const raw = input.value.replace(/\D/g, "");
    input.dataset.raw = raw;
    input.value = raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
  });
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  // Set today date
  const dInput = document.getElementById("dateInput");
  if (dInput) dInput.value = new Date().toISOString().split("T")[0];

  // Setup
  startClock();
  setGreeting();
  applyPrivacy();
  setupAmountInput();

  // Form submit
  const form = document.getElementById("transactionForm");
  if (form) form.addEventListener("submit", handleFormSubmit);

  // Close modal on backdrop click
  document.getElementById("confirmModal")?.addEventListener("click", function (e) {
    if (e.target === this) closeConfirm();
  });

  // Load data
  loadData();
});
