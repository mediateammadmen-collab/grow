/* Data model. All money is stored as integer paisa (1 taka = 100 paisa) to avoid float drift. */

export type TxType = 'income' | 'expense' | 'transfer';

export interface Account { id: string; name: string; open: number }
export interface Tx {
  id: string; type: TxType; date: string; // local "YYYY-MM-DDTHH:mm"
  account: string; to: string; cat: string; sub: string; amount: number; note: string;
}
export interface Holding { id: string; name: string; type: HoldingType; invested: number; value: number }
export interface State {
  v: 2; hide: boolean;
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
    v: 2, hide: false,
    accounts: [{ id: 'cash', name: 'Cash', open: 0 }, { id: 'bkash', name: 'bKash', open: 0 }, { id: 'bank', name: 'Bank account', open: 0 }],
    txs: [], holdings: [], budgets: {},
  };
}
