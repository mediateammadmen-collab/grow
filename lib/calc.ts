import { BUCKET, CATS, pad, type State, type Tx, type TxType } from './data';

/* ---------- formatting (inputs are paisa unless noted) ---------- */
const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
export const money = (p: number) => (p < 0 ? '−' : '') + '৳' + nf.format(Math.abs(p) / 100);
export const moneyT = (taka: number) => money(Math.round(taka * 100));
export function compact(p: number, sym = true) {
  const a = Math.abs(p) / 100; let s: string;
  if (a >= 1e7) s = (a / 1e7).toFixed(2).replace(/\.?0+$/, '') + 'Cr';
  else if (a >= 1e5) s = (a / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
  else if (a >= 1e3) s = (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  else s = String(Math.round(a));
  return (p < 0 ? '−' : '') + (sym ? '৳' : '') + s;
}
export const toPaisa = (v: string | number) => { const x = parseFloat(String(v)); return isFinite(x) ? Math.round(x * 100) : NaN; };
export const toTakaStr = (p: number) => (p ? String(p / 100) : '');

/* ---------- dates ---------- */
export const nowKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
export function shiftMonth(mk: string, delta: number) { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
export function monthLabel(mk: string, short = false) { const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleString('en-GB', short ? { month: 'short' } : { month: 'long', year: 'numeric' }); }
export const dayLabel = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function lastMonths(n: number) { const out: string[] = []; for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(nowKey(), -i)); return out; }

/* ---------- derived ---------- */
export const monthTx = (S: State, mk: string) => S.txs.filter(t => t.date.slice(0, 7) === mk);
export const sum = (arr: Tx[], type: TxType) => arr.reduce((a, t) => a + (t.type === type ? t.amount : 0), 0);
export function catMap(arr: Tx[], type: TxType) { const m: Record<string, number> = {}; arr.forEach(t => { if (t.type === type) m[t.cat] = (m[t.cat] || 0) + t.amount; }); return m; }
export const catTotals = (arr: Tx[], type: TxType) => Object.entries(catMap(arr, type)).sort((a, b) => b[1] - a[1]);
export const accName = (S: State, id: string) => S.accounts.find(x => x.id === id)?.name ?? 'Account';

export function balances(S: State) {
  const b: Record<string, number> = {};
  S.accounts.forEach(a => { b[a.id] = a.open || 0; });
  S.txs.forEach(t => {
    b[t.account] ??= 0;
    if (t.type === 'income') b[t.account] += t.amount;
    else if (t.type === 'expense') b[t.account] -= t.amount;
    else { b[t.account] -= t.amount; if (t.to) { b[t.to] ??= 0; b[t.to] += t.amount; } }
  });
  return b;
}
export const liquid = (S: State) => Object.values(balances(S)).reduce((a, b) => a + b, 0);
export function invTotals(S: State) {
  const invested = S.holdings.reduce((a, h) => a + h.invested, 0), value = S.holdings.reduce((a, h) => a + h.value, 0);
  return { invested, value, gain: value - invested, pct: invested ? (value - invested) / invested * 100 : 0 };
}
export const netWorth = (S: State) => liquid(S) + invTotals(S).value;

export function avgMonthly(S: State) {
  const keys = [1, 2, 3].map(k => shiftMonth(nowKey(), -k)).filter(k => monthTx(S, k).length);
  const use = keys.length ? keys : [nowKey()];
  let i = 0, e = 0;
  use.forEach(k => { const t = monthTx(S, k); i += sum(t, 'income'); e += sum(t, 'expense'); });
  return { income: i / use.length, expense: e / use.length, saving: (i - e) / use.length, months: keys.length };
}
export function monthsTo(target: number, nw: number, saving: number, rate = 0.07) {
  if (nw >= target) return 0;
  const r = rate / 12; let v = nw, m = 0;
  while (v < target && m < 720) { v = v * (1 + r) + Math.max(0, saving); m++; }
  return m < 720 ? m : null;
}
export function allocation(S: State) {
  const b: Record<string, number> = { 'Cash': Math.max(0, liquid(S)) };
  S.holdings.forEach(h => { const k = BUCKET[h.type] || 'Other'; b[k] = (b[k] || 0) + h.value; });
  return b;
}
export function monthSeries(S: State, keys: string[]) { return keys.map(k => { const t = monthTx(S, k); return { mk: k, inc: sum(t, 'income'), exp: sum(t, 'expense') }; }); }

export function checkup(S: State) {
  const a = avgMonthly(S), cur = catMap(monthTx(S, nowKey()), 'expense');
  let over = 0, cnt = 0;
  Object.keys(S.budgets).forEach(c => { const l = S.budgets[c]; if (l > 0) { cnt++; if ((cur[c] || 0) > l) over++; } });
  return { a, em: a.expense > 0 ? liquid(S) / a.expense : null, rate: a.income > 0 ? (a.income - a.expense) / a.income : null, over, cnt };
}

export const MILESTONES: [number, string][] = [[5e5, '5L'], [1e6, '10L'], [2.5e6, '25L'], [5e6, '50L'], [1e7, '1Cr']].map(([t, l]) => [(t as number) * 100, l as string]);

export function emi(principal: number, rate: number, years: number) {
  const n = Math.round(years * 12), r = rate / 100 / 12;
  if (n <= 0) return 0; if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

export const expenseCats = () => Object.keys(CATS.expense);
