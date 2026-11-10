'use client';
import { useEffect, useState } from 'react';
import { CATS, type TxType } from '@/lib/data';
import { catMap, catTotals, compact, dayLabel, money, monthLabel, monthTx, nowKey, shiftMonth, sum, toPaisa, toTakaStr } from '@/lib/calc';
import { useGrow } from '@/lib/store';
import { Donut, Empty, Icon, TxRow } from '../ui';

type Seg = 'tx' | 'stats' | 'budget';

function BudgetInput({ cat, value, onSave }: { cat: string; value: number; onSave: (p: number) => void }) {
  const [v, setV] = useState(toTakaStr(value));
  useEffect(() => setV(toTakaStr(value)), [value]);
  return <input type="number" inputMode="numeric" min="0" step="100" value={v} placeholder="Limit" aria-label={`${cat} monthly limit`}
    onChange={e => setV(e.target.value)} onBlur={() => { const p = toPaisa(v); onSave(p > 0 ? p : 0); }}
    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

export function DailyView() {
  const { S, update, openSheet } = useGrow();
  const [mk, setMk] = useState(nowKey());
  const [seg, setSeg] = useState<Seg>('tx');
  const [stype, setStype] = useState<'income' | 'expense'>('expense');
  useEffect(() => { const s = new URLSearchParams(location.search).get('seg'); if (s === 'stats' || s === 'budget') setSeg(s); }, []);

  const arr = monthTx(S, mk), inc = sum(arr, 'income'), exp = sum(arr, 'expense');
  let body: React.ReactNode;

  if (seg === 'tx') {
    if (!arr.length) body = <div className="card"><Empty title={`No entries in ${monthLabel(mk)}`}>Add what you spent or earned today. It takes about ten seconds.<div style={{ marginTop: 14 }}><button className="btn" onClick={() => openSheet({ kind: 'tx' })}>Add entry</button></div></Empty></div>;
    else {
      const days: Record<string, typeof arr> = {};
      arr.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(t => { (days[t.date.slice(0, 10)] ||= []).push(t); });
      body = <div className="card" style={{ paddingTop: 2 }}>{Object.entries(days).map(([d, ts]) => {
        const di = sum(ts, 'income'), de = sum(ts, 'expense');
        return <div key={d}><div className="dayh"><span>{dayLabel(d)}</span><span>{di > 0 && <span className="inc">+{money(di)} </span>}{de > 0 && <span className="exp">−{money(de)}</span>}</span></div><div className="list">{ts.map(t => <TxRow key={t.id} S={S} t={t} />)}</div></div>;
      })}</div>;
    }
  } else if (seg === 'stats') {
    const tot = stype === 'income' ? inc : exp, rows = catTotals(arr, stype as TxType);
    body = <>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button aria-pressed={stype === 'income'} onClick={() => setStype('income')}>Income {compact(inc)}</button>
        <button aria-pressed={stype === 'expense'} onClick={() => setStype('expense')}>Expenses {compact(exp)}</button>
      </div>
      {!rows.length ? <div className="card"><Empty title={`No ${stype} this month`}>Entries you add will be grouped by category here.</Empty></div> :
        <div className="card stats-card">
          <div className="chart-wrap"><Donut items={rows.map(([c, v]) => ({ v, c: CATS[stype][c]?.c || '#999' }))} total={tot} center={compact(tot)} sub={stype === 'income' ? 'earned' : 'spent'} /></div>
          <div className="list" style={{ marginTop: 10 }}>{rows.map(([c, v]) => <div className="row" key={c}><span className="pct" style={{ background: CATS[stype][c]?.c || '#999' }}>{Math.round(v / tot * 100)}%</span><span className="mid"><span className="t">{c}</span></span><span className="amt num">{money(v)}</span></div>)}</div>
        </div>}
    </>;
  } else {
    const spent = catMap(arr, 'expense'), cats = Object.keys(CATS.expense);
    const tb = cats.reduce((a, c) => a + (S.budgets[c] || 0), 0), ts = cats.reduce((a, c) => a + (spent[c] || 0), 0), left = tb - ts;
    body = <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="lbl">Monthly budget</div>
        <div style={{ font: '500 26px var(--display)', marginTop: 4 }} className="num">{money(ts)} <span className="muted" style={{ fontSize: 16 }}>of {money(tb)}</span></div>
        <div className={(left < 0 ? 'exp' : 'inc') + ' small'} style={{ marginTop: 2 }}>{left >= 0 ? money(left) + ' left to spend' : money(-left) + ' over budget'}</div>
      </div>
      <div className="card budget-grid" style={{ paddingTop: 4 }}>{cats.map(c => {
        const lim = S.budgets[c] || 0, sp = spent[c] || 0, p = lim ? sp / lim * 100 : (sp ? 100 : 0), cls = p > 100 ? 'bad' : p > 85 ? 'warn' : '';
        return <div className="bud" key={c}>
          <div className="bud-top"><span className="t" style={{ fontWeight: 600 }}>{c}</span><BudgetInput cat={c} value={lim} onSave={v => update(s => ({ ...s, budgets: { ...s.budgets, [c]: v } }))} /></div>
          <div className={'bar ' + cls}><i style={{ width: Math.min(100, p) + '%' }} /></div>
          <div className="small muted">{money(sp)} spent{lim ? <> · {lim - sp >= 0 ? money(lim - sp) + ' left' : <span className="exp">{money(sp - lim)} over</span>}</> : ' · set a limit'}</div>
        </div>;
      })}</div>
      <p className="note" style={{ marginTop: 8 }}>Limits repeat every month. Change a number and it saves when you leave the field.</p>
    </>;
  }

  return <>
    <header className="head"><h1>Daily</h1><button className="btn sm" onClick={() => openSheet({ kind: 'tx' })}><Icon name="plus" /> Add entry</button></header>
    <div className="mnav">
      <button onClick={() => setMk(shiftMonth(mk, -1))} aria-label="Previous month"><Icon name="back" /></button>
      <strong>{monthLabel(mk)}</strong>
      <button onClick={() => mk < nowKey() && setMk(shiftMonth(mk, 1))} disabled={mk >= nowKey()} aria-label="Next month"><Icon name="chev" /></button>
    </div>
    <div className="sumbar">
      <div><span className="lbl">Income</span><b className="inc num">{money(inc)}</b></div>
      <div><span className="lbl">Expenses</span><b className="exp num">{money(exp)}</b></div>
      <div><span className="lbl">Balance</span><b className="num">{money(inc - exp)}</b></div>
    </div>
    <div className="seg" role="group" aria-label="View" style={{ marginBottom: 12 }}>
      {(['tx', 'stats', 'budget'] as Seg[]).map(v => <button key={v} aria-pressed={seg === v} onClick={() => setSeg(v)}>{v === 'tx' ? 'Transactions' : v === 'stats' ? 'Stats' : 'Budget'}</button>)}
    </div>
    {body}
  </>;
}
