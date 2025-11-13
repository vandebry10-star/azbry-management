## 💰 Azbry Finance — Personal Money Tracker

Web sederhana untuk mencatat pemasukan & pengeluaran harian, dibangun dengan:
- ⚡ Frontend: HTML + CSS + JavaScript (tanpa framework)
- 🗄️ Database: Supabase (PostgreSQL managed)
- 🌐 Deploy: Vercel + GitHub

Semua logika dijalankan di browser, dan data disimpan di Supabase lewat REST API Supabase JS client.

---

## 🚀 Fitur Singkat

- Tambah transaksi: pemasukan / pengeluaran
- Input tanggal, kategori, nominal, dan catatan
- Ringkasan: total masuk, total keluar, dan saldo
- Filter:
  - Semua transaksi
  - Hari ini
  - Bulan ini
  - Filter kategori (search)
- Data tersimpan di database, bukan di localStorage

---

## 🧱 Struktur Project

```text
azbry-finance/
├─ index.html      # Halaman utama (frontend)
└─ README.md       # Dokumentasi
