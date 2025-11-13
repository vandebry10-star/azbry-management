const { createClient } = supabase;

const SUPABASE_URL = 'https://mxmnmujsqhzrmivdiqvk.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bW5tdWpzcWh6cm1pdmRpcXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjYyMzAsImV4cCI6MjA3ODYwMjIzMH0.BZHHWmSXPwuF1jtIxd4tvIFHke7c5QyiP55lE1oBNVo';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let transactions = [];

const todayLabel = document.getElementById('todayLabel');
const periodLabel = document.getElementById('periodLabel');
const filterPeriod = document.getElementById('filterPeriod');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const transactionBody = document.getElementById('transactionBody');
const countLabel = document.getElementById('countLabel');
const searchCategory = document.getElementById('searchCategory');
const refreshBtn = document.getElementById('refreshBtn');

const dateInput = document.getElementById('dateInput');
const amountInput = document.getElementById('amountInput');
const categoryInput = document.getElementById('categoryInput');
const noteInput = document.getElementById('noteInput');
const btnIncome = document.getElementById('btnIncome');
const btnExpense = document.getElementById('btnExpense');
const form = document.getElementById('transactionForm');

let currentType = 'income';

(function init() {
  const now = new Date();
  todayLabel.textContent = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  dateInput.valueAsDate = now;

  fetchTransactions();
})();

async function fetchTransactions() {
  transactionBody.innerHTML = '<tr><td colspan="6" class="empty-state">Memuat data dari Supabase...</td></tr>';

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error(error);
    transactionBody.innerHTML = '<tr><td colspan="6" class="empty-state">Gagal mengambil data. Cek koneksi atau konfigurasi Supabase.</td></tr>';
    return;
  }

  transactions = data || [];
  render();
}

function setType(type) {
  currentType = type;
  if (type === 'income') {
    btnIncome.classList.add('active-income');
    btnExpense.classList.remove('active-expense');
  } else {
    btnExpense.classList.add('active-expense');
    btnIncome.classList.remove('active-income');
  }
}

btnIncome.addEventListener('click', () => setType('income'));
btnExpense.addEventListener('click', () => setType('expense'));
refreshBtn.addEventListener('click', () => fetchTransactions());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const date = dateInput.value;
  const amount = Number(amountInput.value || 0);
  const category = (categoryInput.value || '').trim() || '-';
  const note = (noteInput.value || '').trim();

  if (!date || !amount) return;

  const payload = { date, type: currentType, amount, category, note };

  const { data, error } = await client
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error(error);
    alert('Gagal menyimpan transaksi');
    return;
  }

  transactions.unshift(data);
  amountInput.value = '';
  noteInput.value = '';
  categoryInput.value = '';
  render();
});

filterPeriod.addEventListener('change', render);
searchCategory.addEventListener('input', render);

transactionBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  if (!id) return;

  if (action === 'delete') {
    if (!confirm('Yakin hapus transaksi ini?')) return;

    const { error } = await client
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Gagal menghapus transaksi');
      return;
    }

    transactions = transactions.filter(t => String(t.id) !== String(id));
    render();
  }
});

function formatCurrency(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function filterByPeriod(list) {
  const mode = filterPeriod.value;
  const now = new Date();
  if (mode === 'today') {
    periodLabel.textContent = 'Hari ini';
    const todayStr = now.toISOString().slice(0, 10);
    return list.filter((t) => t.date === todayStr);
  }
  if (mode === 'month') {
    periodLabel.textContent = 'Bulan ini';
    const ym = now.toISOString().slice(0, 7);
    return list.filter((t) => (t.date || '').slice(0, 7) === ym);
  }
  periodLabel.textContent = 'Semua transaksi';
  return list;
}

function render() {
  let visible = [...transactions];

  visible = filterByPeriod(visible);

  const q = (searchCategory.value || '').trim().toLowerCase();
  if (q) {
    visible = visible.filter((t) =>
      (t.category || '').toLowerCase().includes(q)
    );
  }

  visible.sort((a, b) => Number(b.id) - Number(a.id));

  let income = 0;
  let expense = 0;
  for (const t of visible) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const balance = income - expense;

  totalIncomeEl.textContent = formatCurrency(income);
  totalExpenseEl.textContent = formatCurrency(expense);
  balanceEl.textContent = formatCurrency(balance);
  countLabel.textContent = `${visible.length} transaksi`;

  if (!visible.length) {
    transactionBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Belum ada transaksi untuk filter ini.</td></tr>';
    return;
  }

  transactionBody.innerHTML = visible
    .map((t) => {
      const dateStr = new Date((t.date || '') + 'T00:00:00').toLocaleDateString(
        'id-ID',
        { day: '2-digit', month: 'short', year: 'numeric' }
      );
      return `
        <tr>
          <td>${dateStr}</td>
          <td><span class="tag">${t.type === 'income' ? 'Masuk' : 'Keluar'}</span></td>
          <td>${t.category || '-'}</td>
          <td>${t.note || '-'}</td>
          <td class="right amount ${t.type}">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount).replace('Rp', '')}
          </td>
          <td class="center">
            <button class="btn-sm danger" data-action="delete" data-id="${t.id}">Hapus</button>
          </td>
        </tr>
      `;
    })
    .join('');
}
