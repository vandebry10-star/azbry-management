/* ====== SETTING SUPABASE ====== */
const SUPABASE_URL = "https://mxmnmujsqhzrmivdiqvk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bW5tdWpzcWh6cm1pdmRpcXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjYyMzAsImV4cCI6MjA3ODYwMjIzMH0.BZHHWmSXPwuF1jtIxd4tvIFHke7c5QyiP55lE1oBNVo";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/* ====== LOAD DATA ====== */
async function loadData() {
    const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("id", { ascending: false });

    updateSaldo(data);
    loadToday(data);
    loadHistory(data);
}

/* ====== HITUNG SALDO ====== */
function updateSaldo(data) {
    let saldo = 0;

    data.forEach((t) => {
        if (t.type === "income") saldo += t.amount;
        else saldo -= t.amount;
    });

    document.getElementById("saldoValue").innerText =
        "Rp " + saldo.toLocaleString("id-ID");
}

/* ====== TRANSAKSI HARI INI ====== */
function loadToday(data) {
    const today = new Date().toISOString().split("T")[0];
    const list = document.getElementById("todayTransactions");
    list.innerHTML = "";

    const filtered = data.filter((t) => t.date === today);

    if (filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="3">Belum ada transaksi hari ini</td></tr>`;
        return;
    }

    filtered.forEach((t) => {
        list.innerHTML += `
        <tr>
            <td class="${t.type === "income" ? "green" : "red"}">Rp ${t.amount.toLocaleString(
            "id-ID"
        )}</td>
            <td>${t.type === "income" ? "Masuk" : "Keluar"}</td>
            <td>${t.note || "-"}</td>
        </tr>`;
    });
}

/* ====== RIWAYAT TRANSAKSI ====== */
function loadHistory(data) {
    const list = document.getElementById("historyList");
    list.innerHTML = "";

    data.forEach((t) => {
        list.innerHTML += `
        <tr>
            <td>${t.date}</td>
            <td>${
              t.type === "income"
                ? '<span class="green">Masuk</span>'
                : '<span class="red">Keluar</span>'
            }</td>
            <td>${t.category || "-"}</td>
            <td>${t.note || "-"}</td>
            <td class="${t.type === "income" ? "green" : "red"}">Rp ${t.amount.toLocaleString(
            "id-ID"
        )}</td>
        </tr>`;
    });
}

/* ====== MODAL ====== */
function openRiwayat() {
    document.getElementById("riwayatModal").style.display = "block";
}
function closeRiwayat() {
    document.getElementById("riwayatModal").style.display = "none";
}

/* ====== JALANKAN ====== */
loadData();
