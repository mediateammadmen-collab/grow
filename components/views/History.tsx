'use client';
import { useMemo, useState } from 'react';
import { accName, compact, lastMonths, money, monthLabel, monthSeries, monthTx, nowKey, sum } from '@/lib/calc';
import { pad } from '@/lib/data';
import { downloadFile, useGrow } from '@/lib/store';
import { BarChart, Empty, TxRow } from '../ui';

const TYPES = ['all', 'income', 'expense', 'transfer'] as const;

export function HistoryView() {
  const { S, toast } = useGrow();
  const [month, setMonth] = useState('all');
  const [type, setType] = useState<(typeof TYPES)[number]>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(80);

  const keys = useMemo(() => Array.from(new Set(S.txs.map(t => t.date.slice(0, 7)))).sort().reverse(), [S.txs]);
  let span = 3;
  if (keys.length) { const [ay, am] = keys[keys.length - 1].split('-').map(Number), [by, bm] = nowKey().split('-').map(Number); span = (by - ay) * 12 + (bm - am) + 1; }
  const ms = monthSeries(S, lastMonths(Math.min(12, Math.max(3, span))));

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return S.txs.filter(t => {
      if (month !== 'all' && t.date.slice(0, 7) !== month) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (qq && !`${t.note} ${t.cat} ${t.sub} ${accName(S, t.account)}`.toLowerCase().includes(qq)) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [S, month, type, q]);
  const shown = rows.slice(0, limit);
  const groups: Record<string, typeof rows> = {};
  shown.forEach(t => { (groups[t.date.slice(0, 7)] ||= []).push(t); });

  const csv = () => {
    const qt = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const out = [['Date', 'Type', 'Category', 'Subcategory', 'Account', 'To account', 'Amount', 'Note']].concat(rows.slice().reverse().map(t => [t.date.replace('T', ' '), t.type, t.cat, t.sub, accName(S, t.account), t.to ? accName(S, t.to) : '', String(t.amount / 100), t.note]));
    const d = new Date();
    downloadFile(`grow-transactions-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`, out.map(r => r.map(qt).join(',')).join('\n'), 'text/csv');
    toast('CSV downloaded');
  };

  return <>
    <header className="head"><h1>History</h1>{S.txs.length > 0 && <button className="btn ghost sm" onClick={csv}>Export CSV</button>}</header>
    <div className="hist-grid">
      <div className="stack" style={{ gap: 12 }}>
        <section className="card"><h3>Month by month</h3><div style={{ marginTop: 10 }}><BarChart months={ms} /></div></section>
        <div className="card stack" style={{ gap: 10 }}>
          <div className="f" style={{ gridTemplateColumns: '70px 1fr' }}><label htmlFor="h-month">Month</label>
            <select id="h-month" value={month} onChange={e => { setMonth(e.target.value); setLimit(80); }}><option value="all">All time</option>{keys.map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}</select></div>
          <div className="chips" role="group" aria-label="Type">{TYPES.map(v => <button key={v} className="chip" aria-pressed={type === v} onClick={() => { setType(v); setLimit(80); }}>{v === 'all' ? 'All' : v[0].toUpperCase() + v.slice(1)}</button>)}</div>
          <div className="f" style={{ gridTemplateColumns: '70px 1fr', borderBottom: 0 }}><label htmlFor="h-q">Search</label><input id="h-q" type="search" placeholder="Note, category or account" value={q} onChange={e => { setQ(e.target.value); setLimit(80); }} /></div>
        </div>
      </div>
      <div>
        {!rows.length ? <div className="card"><Empty title="Nothing matches">Try another month, type or search word.</Empty></div> : <>
          <div className="sumbar">
            <div><span className="lbl">Entries</span><b className="num">{rows.length}</b></div>
            <div><span className="lbl">Income</span><b className="inc num">{money(sum(rows, 'income'))}</b></div>
            <div><span className="lbl">Expenses</span><b className="exp num">{money(sum(rows, 'expense'))}</b></div>
          </div>
          {Object.entries(groups).map(([k, ts]) => {
            const all = monthTx(S, k);
            return <div key={k} className="card" style={{ paddingTop: 2, marginBottom: 12 }}>
              <div className="dayh"><span style={{ font: '500 17px var(--display)', color: 'var(--ink)' }}>{monthLabel(k)}</span><span><span className="inc">+{compact(sum(all, 'income'))}</span> <span className="exp">−{compact(sum(all, 'expense'))}</span></span></div>
              <div className="list">{ts.map(t => <TxRow key={t.id} S={S} t={t} showDate />)}</div>
            </div>;
          })}
          {rows.length > limit && <button className="btn ghost full" onClick={() => setLimit(l => l + 80)}>Show more ({rows.length - limit} left)</button>}
        </>}
      </div>
    </div>
  </>;
}
