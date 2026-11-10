/* Data model. All money is stored as integer paisa (1 taka = 100 paisa) to avoid float drift. */

export type TxType = 'income' | 'expense' | 'transfer';

export interface Account { id: string; name: string; open: number }
export interface Tx {
  id: string; type: TxType; date: string; // local "YYYY-MM-DDTHH:mm"
  account: string; to: string; cat: string; sub: string; amount: number; note: string;
}
export interface Holding { id: string; name: string; type: HoldingType; invested: number; value: number }
export interface State {
  v: 2; sample: boolean; hide: boolean; entered: boolean;
  accounts: Account[]; txs: Tx[]; holdings: Holding[]; budgets: Record<string, number>;
}

export const CATS: Record<'income' | 'expense', Record<string, { c: string; subs: string[] }>> = {
  expense: {
    'Household': { c: '#f05d5e', subs: ['Rent', 'Utilities', 'Maintenance', 'Supplies'] },
    'Food': { c: '#f79140', subs: ['Groceries', 'Dining out', 'Snacks', 'Tea & coffee'] },
    'Apparel': { c: '#fbbf3b', subs: ['Clothes', 'Shoes', 'Accessories'] },
    'Social Life': { c: '#e2c400', subs: ['Friends', 'Family', 'Events'] },
    'Gift': { c: '#a8d336', subs: ['Gifts', 'Donations'] },
    'Health': { c: '#56c26a', subs: ['Medicine', 'Doctor', 'Fitness'] },
    'Education': { c: '#3dcfc0', subs: ['Books', 'Courses', 'Tuition'] },
    'Transport': { c: '#38b6e8', subs: ['Rickshaw / CNG', 'Ride share', 'Bus', 'Fuel'] },
    'Other': { c: '#8a7cf0', subs: ['Other'] },
  },
  income: {
    'Salary': { c: '#2bb47f', subs: ['Monthly salary', 'Bonus'] },
    'Freelance': { c: '#3dcfc0', subs: ['Project', 'Retainer'] },
    'Business': { c: '#56c26a', subs: ['Sales', 'Commission'] },
    'Interest': { c: '#38b6e8', subs: ['Savings interest', 'Dividend'] },
    'Gift': { c: '#a8d336', subs: ['Gift'] },
    'Other': { c: '#8a7cf0', subs: ['Other'] },
  },
};

export const HTYPES = {
  'Stocks': '#f79140', 'Mutual funds': '#38b6e8', 'Savings certificates': '#2bb47f',
  'Fixed deposit': '#56c26a', 'Gold': '#fbbf3b', 'Crypto': '#8a7cf0', 'Other': '#9aa8a1',
} as const;
export type HoldingType = keyof typeof HTYPES;

export const BUCKET: Record<HoldingType, string> = {
  'Stocks': 'Stocks', 'Mutual funds': 'Mutual funds', 'Savings certificates': 'Fixed income',
  'Fixed deposit': 'Fixed income', 'Gold': 'Gold', 'Crypto': 'Other', 'Other': 'Other',
};
export const BUCKET_COLOR: Record<string, string> = {
  'Cash': '#9aa8a1', 'Fixed income': '#2bb47f', 'Mutual funds': '#38b6e8', 'Stocks': '#f79140', 'Gold': '#fbbf3b', 'Other': '#8a7cf0',
};

export function catColor(t: Pick<Tx, 'type' | 'cat'>): string {
  if (t.type === 'transfer') return '#9aa8a1';
  return CATS[t.type][t.cat]?.c ?? '#9aa8a1';
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const uid = () => {
  try { return crypto.randomUUID(); } catch { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
};

export function makeEmpty(): State {
  return {
    v: 2, sample: false, hide: false, entered: false,
    accounts: [{ id: 'cash', name: 'Cash', open: 0 }, { id: 'bkash', name: 'bKash', open: 0 }, { id: 'bank', name: 'Bank account', open: 0 }],
    txs: [], holdings: [], budgets: {},
  };
}

type Row = [number, TxType, string, string, number, string, string, string?];
const P = 100; // taka -> paisa

export function makeSeed(): State {
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth(), td = now.getDate();
  const txs: Tx[] = []; let n = 0;
  const add = (y: number, m: number, d: number, r: Row, f: number) => {
    let amt = r[4];
    if (f !== 1 && r[1] === 'expense' && r[3] !== 'Rent') amt = Math.round(amt * f / 10) * 10;
    txs.push({ id: 's' + (n++), type: r[1], date: `${y}-${pad(m + 1)}-${pad(d)}T19:15`, account: r[6], to: r[7] || '', cat: r[2], sub: r[3], amount: amt * P, note: r[5] });
  };
  const T: Row[] = [
    [1, 'income', 'Salary', 'Monthly salary', 90000, 'Salary', 'bank'],
    [1, 'transfer', '', '', 20000, 'Cash withdrawal', 'bank', 'cash'],
    [2, 'expense', 'Household', 'Rent', 22000, 'House rent', 'bank'],
    [4, 'expense', 'Food', 'Groceries', 3650, 'Weekly bazar', 'cash'],
    [5, 'expense', 'Household', 'Utilities', 3100, 'Electricity, gas and wifi', 'bkash'],
    [6, 'expense', 'Transport', 'Rickshaw / CNG', 420, 'Office commute', 'bkash'],
    [8, 'expense', 'Health', 'Medicine', 1260, 'Pharmacy', 'cash'],
    [9, 'expense', 'Food', 'Dining out', 1100, 'Dinner with family', 'cash'],
    [11, 'expense', 'Food', 'Groceries', 4150, 'Weekly bazar', 'cash'],
    [12, 'expense', 'Education', 'Books', 880, 'Books', 'cash'],
    [13, 'expense', 'Transport', 'Ride share', 380, 'Pathao ride', 'bkash'],
    [14, 'expense', 'Apparel', 'Clothes', 4200, 'Shirts', 'bank'],
    [16, 'expense', 'Social Life', 'Friends', 1850, 'Friends hangout', 'cash'],
    [18, 'income', 'Freelance', 'Project', 7500, 'Freelance design project', 'bkash'],
    [18, 'expense', 'Food', 'Groceries', 3820, 'Weekly bazar', 'cash'],
    [20, 'expense', 'Transport', 'Rickshaw / CNG', 460, 'Commute', 'bkash'],
    [21, 'expense', 'Food', 'Dining out', 600, 'Lunch', 'cash'],
    [23, 'expense', 'Gift', 'Gifts', 1500, 'Birthday gift', 'cash'],
    [23, 'expense', 'Food', 'Groceries', 3980, 'Weekly bazar', 'cash'],
    [27, 'expense', 'Transport', 'Rickshaw / CNG', 359, 'Commute', 'bkash'],
  ];
  ([[3, 1.06], [2, 0.94], [1, 1]] as const).forEach(([back, f]) => {
    const d = new Date(Y, M - back, 1);
    T.forEach(r => { if (back === 3 && r[2] === 'Freelance') return; add(d.getFullYear(), d.getMonth(), r[0], r, f); });
  });
  const C: Row[] = [
    [1, 'income', 'Salary', 'Monthly salary', 90000, 'Salary', 'bank'],
    [1, 'transfer', '', '', 20000, 'Cash withdrawal', 'bank', 'cash'],
    [2, 'expense', 'Household', 'Rent', 22000, 'House rent', 'bank'],
    [3, 'expense', 'Food', 'Groceries', 3720, 'Weekly bazar', 'cash'],
    [4, 'expense', 'Transport', 'Rickshaw / CNG', 340, 'Office commute', 'bkash'],
    [5, 'expense', 'Household', 'Utilities', 2850, 'Electricity, gas and wifi', 'bkash'],
    [6, 'expense', 'Food', 'Dining out', 780, 'Lunch with team', 'cash'],
    [6, 'expense', 'Transport', 'Ride share', 290, 'Pathao ride', 'bkash'],
  ];
  C.forEach(r => { if (r[0] <= td) add(Y, M, r[0], r, 1); });
  const b: Record<string, number> = { 'Household': 26000, 'Food': 18000, 'Apparel': 4000, 'Social Life': 2500, 'Gift': 1500, 'Health': 2000, 'Education': 1500, 'Transport': 2000, 'Other': 2000 };
  return {
    v: 2, sample: true, hide: false, entered: true,
    accounts: [{ id: 'cash', name: 'Cash', open: 60000 * P }, { id: 'bkash', name: 'bKash', open: 25000 * P }, { id: 'bank', name: 'Bank account', open: 400000 * P }],
    txs,
    holdings: [
      { id: 'h1', name: 'DSE blue-chip stocks', type: 'Stocks', invested: 120000 * P, value: 134500 * P },
      { id: 'h2', name: 'Equity mutual fund', type: 'Mutual funds', invested: 60000 * P, value: 64200 * P },
      { id: 'h3', name: 'Savings certificates', type: 'Savings certificates', invested: 200000 * P, value: 214000 * P },
      { id: 'h4', name: 'Gold (physical)', type: 'Gold', invested: 90000 * P, value: 98000 * P },
    ],
    budgets: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v * P])),
  };
}

/* Accepts a Grow backup: v2 (paisa) or the old v1 app (taka floats), and returns a clean State. */
export function cleanBackup(o: unknown): State | null {
  if (!o || typeof o !== 'object') return null;
  const r = o as Record<string, unknown>;
  if (!Array.isArray(r.txs) || !Array.isArray(r.accounts) || !r.accounts.length) return null;
  const isV2 = r.v === 2;
  const toP = (v: unknown) => { const x = Number(v); if (!isFinite(x)) return 0; return isV2 ? Math.round(x) : Math.round(x * 100); };
  const str = (v: unknown) => String(v ?? '').slice(0, 200);
  const okDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  const budgets: Record<string, number> = {};
  if (r.budgets && typeof r.budgets === 'object') Object.entries(r.budgets as Record<string, unknown>).slice(0, 50).forEach(([k, v]) => { budgets[str(k)] = Math.max(0, toP(v)); });
  return {
    v: 2, sample: false, hide: !!r.hide, entered: true,
    accounts: (r.accounts as Record<string, unknown>[]).filter(a => a && a.id).slice(0, 20).map(a => ({ id: str(a.id), name: str(a.name) || 'Account', open: toP(a.open) })),
    txs: (r.txs as Record<string, unknown>[]).filter(t => t && ['income', 'expense', 'transfer'].includes(String(t.type)) && okDate.test(String(t.date))).slice(0, 50000).map(t => ({
      id: str(t.id) || uid(), type: t.type as TxType, date: str(t.date).slice(0, 16), account: str(t.account), to: str(t.to),
      cat: str(t.cat), sub: str(t.sub), amount: Math.abs(toP(t.amount)), note: str(t.note),
    })),
    holdings: (Array.isArray(r.holdings) ? r.holdings as Record<string, unknown>[] : []).slice(0, 500).map(h => ({
      id: str(h?.id) || uid(), name: str(h?.name), type: (String(h?.type) in HTYPES ? h.type : 'Other') as HoldingType,
      invested: toP(h?.invested), value: toP(h?.value),
    })),
    budgets,
  };
}
