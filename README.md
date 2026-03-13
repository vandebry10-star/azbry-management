# Azbry Finance 💰

Personal finance management — mobile-first PWA dengan Supabase backend.

## Stack
- Vanilla HTML/CSS/JS
- Supabase (PostgreSQL)
- Chart.js
- PWA ready (offline support)
- Deploy via Vercel

## Fitur
- ✦ Dashboard saldo realtime
- ✦ Tambah pemasukan & pengeluaran
- ✦ Riwayat dengan filter & pencarian
- ✦ Export CSV
- ✦ Analitik: donut chart kategori, tren 6 bulan, top pengeluaran
- ✦ Privacy mode (blur nominal)
- ✦ Dark mode premium
- ✦ PWA installable

## Deploy ke Vercel

1. Push repo ke GitHub
2. Buka [vercel.com](https://vercel.com) → Import repo
3. Framework: **Other** (static)
4. Deploy ✓

## Supabase Table

```sql
create table transactions (
  id bigint generated always as identity primary key,
  date date not null,
  type text check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  note text,
  created_at timestamptz default now()
);
```
