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

/* ====== LOAD DATA ====== */
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
  updateStats(rows);
  renderToday(rows);
}

/* ====== HITUNG SALDO ====== */
function updateSaldo(rows) {
  let saldo = 0;
  rows.forEach((t) => {
    if (t.type === "income") saldo += t.amount;
    else saldo -= t.amount;
  });

  document.getElementById("saldoValue").innerText = formatRupiah(saldo);
}

/* ====== STAT SUMMARY ====== */
function updateStats(rows) {
  const totalEl = document.getElementById("totalTransactions");
  const lastEl = document.getElementById("lastUpdated");

  if (totalEl) totalEl.innerText = rows.length;

  if (!rows.length) {
    if (lastEl) lastEl.innerText = "-";
    return;
  }

  const latest = rows[0];
  if (lastEl) lastEl.innerText = latest.date;
}

/* ====== RINGKASAN HARI INI (KALAU ADA TABEL HARI INI) ====== */
function renderToday(rows) {
  const today = new Date().toISOString().split("T")[0];
  const tbody =
    document.getElementById("hariIniTable") ||
    document.getElementById("hariIniList");
  if (!tbody) return;

  const todayRows = rows.filter((t) => t.date === today);

  tbody.innerHTML = "";

  if (!todayRows.length) {
    tbody.innerHTML =
      `<tr><td colspan="4" class="empty">Belum ada transaksi</td></tr>`;
    return;
  }

  todayRows.forEach((t) => {
    tbody.innerHTML += `
      <tr>
        <td class="${t.type === "income" ? "green" : "red"}">
          ${formatRupiah(t.amount)}
        </td>
        <td>${t.type === "income" ? "Masuk" : "Keluar"}</td>
        <td>${t.note || "-"}</td>
        <td>
          <button class="btn-delete" onclick="deleteTxn(${t.id})">Hapus</button>
        </td>
      </tr>
    `;
  });
}

/* ====== RENDER RIWAYAT (MODAL) ====== */
function renderHistory(rows) {
  const tbody = document.getElementById("historyList");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="6">Belum ada transaksi sama sekali.</td></tr>';
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
        <td>
          <button class="btn-delete" onclick="deleteTxn(${t.id})">Hapus</button>
        </td>
      </tr>
    `;
  });
}

/* ====== TAMBAH TRANSAKSI ====== */
async function handleFormSubmit(e) {
  e.preventDefault();

  const date = document.getElementById("dateInput").value;
  const type = document.getElementById("typeInput").value;

  const amountInput = document.getElementById("amountInput");
  const rawFromData = amountInput.dataset.raw || "";
  const cleaned = rawFromData || amountInput.value.replace(/\D/g, "");
  const amount = Number(cleaned || 0);

  const category = document.getElementById("categoryInput").value || "";
  const note = document.getElementById("noteInput").value || "";

  if (!date || !amount) {
    alert("Tanggal & nominal wajib diisi.");
    return;
  }

  const payload = { date, type, amount, category, note };

  const { error } = await client.from("transactions").insert([payload]);
  if (error) {
    console.error(error);
    alert("Gagal menyimpan transaksi.");
    return;
  }

  document.getElementById("transactionForm").reset();
  document.getElementById("dateInput").value = date;

  await loadData();
}

/* ====== DELETE SATU TRANSAKSI ====== */
window.deleteTxn = async function (id) {
  const yakin = confirm("Yakin ingin menghapus transaksi ini?");
  if (!yakin) return;

  const { error } = await client.from("transactions").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus transaksi.");
    return;
  }

  await loadData();
};

/* ====== RESET SEMUA RIWAYAT ====== */
window.resetRiwayat = async function () {
  const yakin = confirm("YAKIN mau hapus SEMUA riwayat transaksi?");
  if (!yakin) return;

  const { error } = await client.from("transactions").delete().neq("id", 0);
  if (error) {
    console.error(error);
    alert("Gagal reset data.");
    return;
  }

  await loadData();
};

/* ====== MODAL ====== */
window.openRiwayat = function () {
  const m = document.getElementById("riwayatModal");
  if (m) m.style.display = "block";
};

window.closeRiwayat = function () {
  const m = document.getElementById("riwayatModal");
  if (m) m.style.display = "none";
};

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  const dInput = document.getElementById("dateInput");
  if (dInput) dInput.value = today;

  // AUTO FORMAT NOMINAL (10000 -> 10.000)
  const amountInput = document.getElementById("amountInput");
  if (amountInput) {
    amountInput.addEventListener("input", () => {
      let raw = amountInput.value.replace(/\D/g, ""); // buang non-angka

      if (!raw) {
        amountInput.dataset.raw = "";
        amountInput.value = "";
        return;
      }

      // simpan angka murni
      amountInput.dataset.raw = raw;

      // format tampilan pakai titik
      amountInput.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });
  }

  startClock();
  loadData();

  const form = document.getElementById("transactionForm");
  if (form) form.addEventListener("submit", handleFormSubmit);
});
