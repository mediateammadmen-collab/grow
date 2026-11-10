'use client';
/*
 * Sync between the in-memory State and Supabase.
 * The browser keeps a full local copy (fast, works offline). Every change is diffed against the
 * previous state and only the changed rows are written. If a write fails, the user is marked
 * "dirty" and the whole local copy is pushed again when the connection comes back.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { HTYPES, makeEmpty, type Account, type Holding, type HoldingType, type State, type Tx, type TxType } from './data';

const CHUNK = 500;

/* ---------- row mapping ---------- */
const txRow = (u: string, t: Tx) => ({ user_id: u, id: t.id, type: t.type, occurred_at: t.date.slice(0, 16) + ':00', account_id: t.account, to_account: t.type === 'transfer' ? t.to : null, category: t.cat, subcategory: t.sub, amount: t.amount, note: t.note });
const accRow = (u: string, a: Account, i: number) => ({ user_id: u, id: a.id, name: a.name, opening_balance: a.open, sort: i });
const holdRow = (u: string, h: Holding) => ({ user_id: u, id: h.id, name: h.name, type: h.type, invested: h.invested, value: h.value });

type Row = Record<string, unknown>;
const fromTx = (r: Row): Tx => ({ id: String(r.id), type: r.type as TxType, date: String(r.occurred_at).slice(0, 16), account: String(r.account_id), to: String(r.to_account ?? ''), cat: String(r.category ?? ''), sub: String(r.subcategory ?? ''), amount: Number(r.amount), note: String(r.note ?? '') });
const fromHold = (r: Row): Holding => ({ id: String(r.id), name: String(r.name), type: (String(r.type) in HTYPES ? r.type : 'Other') as HoldingType, invested: Number(r.invested), value: Number(r.value) });

async function selectAll(sb: SupabaseClient, table: string, order: string) {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').order(order).range(from, from + 999);
    if (error) throw error;
    out.push(...(data as Row[]));
    if (!data || data.length < 1000) return out;
  }
}

/* Loads everything for the signed-in user. Returns null when the account has no data yet. */
export async function pull(sb: SupabaseClient): Promise<State | null> {
  const [prof, accs, txs, holds, buds] = await Promise.all([
    sb.from('profiles').select('*').maybeSingle(),
    selectAll(sb, 'accounts', 'sort'),
    selectAll(sb, 'transactions', 'occurred_at'),
    selectAll(sb, 'holdings', 'id'),
    selectAll(sb, 'budgets', 'category'),
  ]);
  if (prof.error) throw prof.error;
  if (!accs.length && !txs.length && !holds.length && !buds.length) return null;
  return {
    v: 2, hide: !!prof.data?.hide_amounts,
    accounts: accs.length ? accs.map(r => ({ id: String(r.id), name: String(r.name), open: Number(r.opening_balance) })) : makeEmpty().accounts,
    txs: txs.map(fromTx), holdings: holds.map(fromHold),
    budgets: Object.fromEntries(buds.map(r => [String(r.category), Number(r.amount)])),
  };
}

async function upsert(sb: SupabaseClient, table: string, rows: Row[], onConflict: string) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw error;
  }
}
async function remove(sb: SupabaseClient, table: string, col: string, keys: string[]) {
  for (let i = 0; i < keys.length; i += 200) {
    const { error } = await sb.from(table).delete().in(col, keys.slice(i, i + 200));
    if (error) throw error;
  }
}
const changed = <T extends { id: string }>(a: T[], b: T[]) => {
  const prev = new Map(a.map(x => [x.id, JSON.stringify(x)]));
  const next = new Set(b.map(x => x.id));
  return { put: b.filter(x => prev.get(x.id) !== JSON.stringify(x)), del: a.filter(x => !next.has(x.id)).map(x => x.id) };
};

/* Writes only what differs between two states. */
export async function pushDiff(sb: SupabaseClient, u: string, a: State, b: State) {
  if (a.hide !== b.hide) {
    const { error } = await sb.from('profiles').upsert({ id: u, hide_amounts: b.hide }, { onConflict: 'id' }); if (error) throw error;
  }
  const accChanged = JSON.stringify(a.accounts) !== JSON.stringify(b.accounts);
  if (accChanged) {
    await upsert(sb, 'accounts', b.accounts.map((x, i) => accRow(u, x, i)), 'user_id,id');
    const gone = a.accounts.filter(x => !b.accounts.some(y => y.id === x.id)).map(x => x.id);
    if (gone.length) await remove(sb, 'accounts', 'id', gone);
  }
  const t = changed(a.txs, b.txs);
  if (t.put.length) await upsert(sb, 'transactions', t.put.map(x => txRow(u, x)), 'user_id,id');
  if (t.del.length) await remove(sb, 'transactions', 'id', t.del);
  const h = changed(a.holdings, b.holdings);
  if (h.put.length) await upsert(sb, 'holdings', h.put.map(x => holdRow(u, x)), 'user_id,id');
  if (h.del.length) await remove(sb, 'holdings', 'id', h.del);
  const bp = Object.entries(b.budgets).filter(([k, v]) => a.budgets[k] !== v);
  const bd = Object.keys(a.budgets).filter(k => !(k in b.budgets));
  if (bp.length) await upsert(sb, 'budgets', bp.map(([category, amount]) => ({ user_id: u, category, amount })), 'user_id,category');
  if (bd.length) await remove(sb, 'budgets', 'category', bd);
}

/* Makes the server match the local copy exactly (used after offline edits and when importing guest data). */
export async function pushAll(sb: SupabaseClient, u: string, s: State) {
  const server = await pull(sb).catch(() => null);
  await pushDiff(sb, u, server ?? { ...makeEmpty(), accounts: [], hide: !s.hide }, s);
}

