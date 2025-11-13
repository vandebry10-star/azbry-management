/* ====== SETTING SUPABASE ====== */
const SUPABASE_URL = "https://mxmnmujsqhzrmivdiqvk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bW5tdWpzcWh6cm1pdmRpcXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjYyMzAsImV4cCI6MjA3ODYwMjIzMH0.BZHHWmSXPwuF1jtIxd4tvIFHke7c5QyiP55lE1oBNVo";

// pake nama lain biar ga tabrakan
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ====== JAM REALTIME ====== */
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

  updateSaldo(data || []);
  loadToday(data || []);
  loadHistory(data || []);
}

/* ====== HITUNG SALDO TOTAL ====== */
function updateSaldo(rows) {
  let saldo = 0;

  rows.forEach((t) => {
    if (t.type === "income") saldo += t.amount;
    else saldo -= t.amount;
  });

  document.getElementById("saldoValue").innerText =
    "Rp " + saldo.toLocaleString("id-ID");
}

/* ====== TRANSAKSI HARI INI ====== */
function loadToday(rows) {
  const today = new Date().toISOString().split("T")[0];
  const tbody = document.getElementById("todayTransactions");
  tbody.innerHTML = "";

  const todayRows = rows.filter((t) => t.date === today);

  if (!todayRows.length) {
    tbody.innerHTML =
      '<tr><td colspan="3">Belum ada transaksi hari ini</td></tr>';
    return;
  }

  todayRows.forEach((t) => {
    tbody.innerHTML += `
      <tr>
        <td class="${t.type === "income" ? "green" : "red"}">
          Rp ${t.amount.toLocaleString("id-ID")}
        </td>
        <td>${t.type === "income" ? "Masuk" : "Keluar"}</td>
        <td>${t.note || "-"}</td>
      </tr>
    `;
  });
}

/* ====== RIWAYAT LENGKAP ====== */
function loadHistory(rows) {
  const tbody = document.getElementById("historyList");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">Belum ada transaksi sama sekali</td></tr>';
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
          Rp ${t.amount.toLocaleString("id-ID")}
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

/* ====== JALANKAN SAAT HALAMAN SIAP ====== */
document.addEventListener("DOMContentLoaded", loadData);
