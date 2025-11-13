/* ====== KONFIG SUPABASE ====== */
const SUPABASE_URL = "https://mxmnmujsqhzrmivdiqvk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bW5tdWpzcWh6cm1pdmRpcXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjYyMzAsImV4cCI6MjA3ODYwMjIzMH0.BZHHWmSXPwuF1jtIxd4tvIFHke7c5QyiP55lE1oBNVo";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ====== UTIL ====== */
function formatRupiah(num) {
  return "Rp " + (num || 0).toLocaleString("id-ID");
}

/* ====== JAM REALTIME ====== */
function startClock() {
  setInterval(() => {
    const now = new Date();

    document.getElementById("current-date").innerText =
      now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    document.getElementById("current-time").innerText =
      now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
  }, 1000);
}

/* ====== LOAD DATA DARI SUPABASE ====== */
async function loadData() {
  const { data, error } = await client
    .from("transactions")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const rows = data || [];
  updateSaldo(rows);
  renderHistory(rows);
}

/* ====== UPDATE SALDO ====== */
function updateSaldo(rows) {
  let saldo = 0;
  rows.forEach((t) => {
    if (t.type === "income") saldo += t.amount;
    else saldo -= t.amount;
  });
  document.getElementById("saldoValue").innerText = formatRupiah(saldo);
}

/* ====== RENDER RIWAYAT (MODAL) ====== */
function renderHistory(rows) {
  const tbody = document.getElementById("historyList");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">Belum ada transaksi sama sekali.</td></tr>';
    return;
  }

  rows.forEach((t) => {
    tbody.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${
          t.type === "income"
            ? '<span class="green">Masuk</span>'
            : '<span class="red">Keluar</span>'
        }</td>
        <td>${t.category || "-"}</td>
        <td>${t.note || "-"}</td>
        <td class="${t.type === "income" ? "green" : "red"}">
          ${formatRupiah(t.amount)}
        </td>
      </tr>
    `;
  });
}

/* ====== MODAL RIWAYAT ====== */
window.openRiwayat = function () {
  document.getElementById("riwayatModal").style.display = "block";
};

window.closeRiwayat = function () {
  document.getElementById("riwayatModal").style.display = "none";
};

/* ====== SUBMIT FORM TRANSAKSI ====== */
async function handleFormSubmit(e) {
  e.preventDefault();

  const date = document.getElementById("dateInput").value;
  const type = document.getElementById("typeInput").value;
  const amount = Number(document.getElementById("amountInput").value || 0);
  const category = document.getElementById("categoryInput").value || "";
  const note = document.getElementById("noteInput").value || "";

  if (!date || !amount) {
    alert("Tanggal dan nominal wajib diisi.");
    return;
  }

  const payload = { date, type, amount, category, note };

  const { error } = await client.from("transactions").insert([payload]);
  if (error) {
    console.error(error);
    alert("Gagal menyimpan transaksi.");
    return;
  }

  // reset form (tanggal tetap)
  document.getElementById("transactionForm").reset();
  document.getElementById("dateInput").value = date;

  await loadData(); // refresh saldo + riwayat
  alert("Transaksi tersimpan.");
}

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", () => {
  // set default tanggal hari ini
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateInput").value = today;

  startClock();
  loadData();

  document
    .getElementById("transactionForm")
    .addEventListener("submit", handleFormSubmit);
});
