'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BUCKET_COLOR, CATS, HTYPES, makeSeed } from '@/lib/data';
import { allocation, avgMonthly, balances, catTotals, compact, invTotals, lastMonths, MILESTONES, money, monthLabel, monthSeries, monthsTo, monthTx, netWorth, nowKey, sum } from '@/lib/calc';
import { useGrow } from '@/lib/store';
import { BarChart, Donut, Empty, Icon, TxRow } from '../ui';

function Track({ nw }: { nw: number }) {
  const pts = [0, ...MILESTONES.map(m => m[0])]; let pos = 0;
  if (nw >= pts[pts.length - 1]) pos = pts.length - 1;
  else for (let i = 0; i < pts.length - 1; i++) { if (nw >= pts[i + 1]) pos = i + 1; else { pos = i + Math.max(0, (nw - pts[i]) / (pts[i + 1] - pts[i])); break; } }
  const pct = Math.min(100, pos / (pts.length - 1) * 100);
  return (
    <div className="track">
      <div className="track-bar"><i style={{ width: pct + '%' }} /></div>
      <span className="dot" style={{ left: pct + '%' }} />
      {MILESTONES.map((m, i) => <div key={m[1]} className={'tick' + (nw >= m[0] ? ' done' : '') + (i === MILESTONES.length - 1 ? ' last' : '')} style={{ left: (i + 1) / MILESTONES.length * 100 + '%' }}><b>{m[1]}</b>{nw >= m[0] ? 'reached' : ''}</div>)}
    </div>
  );
}

export function HomeView() {
  const { S, update, openSheet, replace } = useGrow();
  const [seg, setSeg] = useState<'cash' | 'inv'>('cash');
  const mk = nowKey(), cur = monthTx(S, mk), inc = sum(cur, 'income'), exp = sum(cur, 'expense'), flow = inc - exp;
  const nw = netWorth(S), inv = invTotals(S), bal = balances(S);
  const vis = (n: number) => S.hide ? '৳ ••••••' : money(n);

  const nx = MILESTONES.find(m => nw < m[0]);
  let next: React.ReactNode;
  if (nw <= 0 && !S.txs.length) next = <p className="next-ms muted">Add your balances and first entries to see your path to ৳5L.</p>;
  else if (!nx) next = <p className="next-ms muted">You have passed every milestone on this track.</p>;
  else {
    const mo = monthsTo(nx[0], nw, avgMonthly(S).saving);
    const when = mo === null ? 'more than 60 years' : mo < 12 ? mo + ' months' : (mo / 12).toFixed(1) + ' years';
    next = <p className="next-ms"><b>Next: {nx[1]}</b> <span className="muted">· {S.hide ? '' : money(nx[0] - nw) + ' to go · '}about {when} at your recent saving pace and 7% yearly growth (an estimate).</span></p>;
  }

  const top = catTotals(cur, 'expense').slice(0, 4);
  const al = allocation(S), tot = Object.values(al).reduce((a, b) => a + b, 0);
  const items = Object.entries(al).filter(e => e[1] > 0).map(([n, v]) => ({ n, v, c: BUCKET_COLOR[n] || '#999' }));
  const rec = S.txs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div className="stack">
      <header className="head" style={{ marginBottom: 0 }}>
        <div className="brand mob"><span className="logo"><Icon name="chart" /></span><h1>Grow</h1></div>
        <h1 className="desk">Overview</h1>
        <div className="head-actions">
          <button className="iconbtn mob" onClick={() => openSheet({ kind: 'settings' })} aria-label="Settings"><Icon name="gear" /></button>
          <button className="iconbtn solid mob" onClick={() => openSheet({ kind: 'tx' })} aria-label="Add entry"><Icon name="plus" /></button>
        </div>
      </header>

      {S.sample && <div className="banner"><span><b>Example data.</b> These numbers are made up so you can look around. Open Settings to clear them and start with your own.</span></div>}

      {!S.txs.length && !S.holdings.length && (
        <section className="card"><h3>Let’s set up Grow</h3>
          <div className="list" style={{ marginTop: 6 }}>
            <button className="row" onClick={() => openSheet({ kind: 'settings' })}><span className="sw" style={{ background: '#8ee3bf' }}>1</span><span className="mid"><span className="t" style={{ display: 'block' }}>Set your account balances</span><span className="s" style={{ display: 'block' }}>What your cash, bKash and bank hold today</span></span><Icon name="chev" /></button>
            <button className="row" onClick={() => openSheet({ kind: 'tx' })}><span className="sw" style={{ background: '#f2bd10' }}>2</span><span className="mid"><span className="t" style={{ display: 'block' }}>Add your first entry</span><span className="s" style={{ display: 'block' }}>An expense or income takes ten seconds</span></span><Icon name="chev" /></button>
            <Link className="row" href="/ask"><span className="sw" style={{ background: '#7cc0ff' }}>3</span><span className="mid"><span className="t" style={{ display: 'block' }}>Ask Grow about money</span><span className="s" style={{ display: 'block' }}>Budgeting, saving, loans, cards and investing</span></span><Icon name="chev" /></Link>
          </div>
          <button className="link" style={{ marginTop: 8 }} onClick={() => replace({ ...makeSeed(), hide: S.hide })}>Or look around with example data</button>
        </section>
      )}

      <div className="home-grid">
        <div className="stack">
          <section className="card nw">
            <div className="lbl">Net worth <button className="eye" onClick={() => update(s => ({ ...s, hide: !s.hide }))} aria-label={S.hide ? 'Show amounts' : 'Hide amounts'}><Icon name={S.hide ? 'eyeoff' : 'eye'} /></button></div>
            <div className="nw-v num">{vis(nw)}</div>
            <div className={'nw-d ' + (flow >= 0 ? 'inc' : 'exp')}>{flow >= 0 ? '▲ ' : '▼ '}{money(Math.abs(flow))} cash flow in {monthLabel(mk, true)}</div>
            <Track nw={nw} />{next}
          </section>
          <div className="grid2 tiles4">
            <div className="tile"><div className="lbl">Income</div><div className="v inc num">{money(inc)}</div><div className="s">{monthLabel(mk)}</div></div>
            <div className="tile"><div className="lbl">Expenses</div><div className="v exp num">{money(exp)}</div><div className="s">{inc ? Math.round(exp / inc * 100) + '% of income' : ''}</div></div>
            <div className="tile"><div className="lbl">Cash flow</div><div className={'v num ' + (flow >= 0 ? 'inc' : 'exp')}>{flow >= 0 ? '+' : ''}{money(flow)}</div><div className="s">{inc ? 'Saved ' + Math.round(flow / inc * 100) + '%' : 'No income yet'}</div></div>
            <div className="tile"><div className="lbl">Investments</div><div className="v num">{vis(inv.value)}</div><div className={'s ' + (inv.gain >= 0 ? 'inc' : 'exp')}>{S.hide ? '' : (inv.gain >= 0 ? '+' : '') + inv.pct.toFixed(1) + '% overall'}</div></div>
          </div>
          <div className="seg" role="group" aria-label="Section">
            <button aria-pressed={seg === 'cash'} onClick={() => setSeg('cash')}>Cash flow</button>
            <button aria-pressed={seg === 'inv'} onClick={() => setSeg('inv')}>Investments</button>
          </div>
          {seg === 'cash' ? <>
            <section className="card"><h3>Last 6 months</h3><div style={{ marginTop: 10 }}><BarChart months={monthSeries(S, lastMonths(6))} /></div></section>
            <section className="card"><h3>Where it went in {monthLabel(mk, true)}</h3>
              <div className="list" style={{ marginTop: 6 }}>
                {top.length ? top.map(([c, v]) => { const col = CATS.expense[c]?.c || '#999'; return <div className="row" key={c}><span className="sw" style={{ background: col }}>{c[0]}</span><span className="mid"><span className="t" style={{ display: 'block' }}>{c}</span><div className="bar" style={{ marginTop: 6 }}><i style={{ width: (exp ? v / exp * 100 : 0) + '%', background: col }} /></div></span><span className="amt num">{money(v)}</span></div>; })
                  : <p className="muted small" style={{ padding: '8px 0' }}>No expenses recorded this month.</p>}
              </div>
              <Link className="link" href="/daily?seg=stats" style={{ display: 'inline-block', marginTop: 8 }}>See all categories</Link>
            </section>
          </> : <>
            <section className="card"><h3>Portfolio mix</h3>
              <div className="chart-wrap" style={{ marginTop: 10 }}>
                <Donut items={items} total={tot} center={S.hide ? '••••' : compact(tot)} sub="incl. cash" />
                <div className="legend">{items.map(i => <span key={i.n}><i style={{ background: i.c }} />{i.n} <b>{tot ? Math.round(i.v / tot * 100) : 0}%</b></span>)}</div>
              </div>
            </section>
            <section className="card">
              <div className="sec-h" style={{ margin: '0 0 4px' }}><h3>Holdings</h3><button className="link" onClick={() => openSheet({ kind: 'hold' })}>+ Add</button></div>
              <div className="list">
                {S.holdings.length ? S.holdings.map(h => {
                  const g = h.value - h.invested, gp = h.invested ? g / h.invested * 100 : 0;
                  return <button className="row" key={h.id} onClick={() => openSheet({ kind: 'hold', id: h.id })}>
                    <span className="sw" style={{ background: HTYPES[h.type] || '#999' }}>{h.type[0]}</span>
                    <span className="mid"><span className="t" style={{ display: 'block' }}>{h.name}</span><span className="s" style={{ display: 'block' }}>{h.type}{S.hide ? '' : ' · invested ' + money(h.invested)}</span></span>
                    <span style={{ textAlign: 'right' }}><span className="amt num" style={{ display: 'block' }}>{vis(h.value)}</span>{!S.hide && <span className={'small ' + (g >= 0 ? 'inc' : 'exp')}>{g >= 0 ? '+' : ''}{gp.toFixed(1)}%</span>}</span>
                  </button>;
                }) : <Empty title="No investments yet">Add stocks, funds, savings certificates or gold to see your whole portfolio here.</Empty>}
              </div>
            </section>
          </>}
        </div>

        <div className="stack">
          <section className="card"><h3>Accounts</h3>
            <div className="list" style={{ marginTop: 6 }}>{S.accounts.map(a => <div className="row" key={a.id}><span className="mid"><span className="t" style={{ display: 'block' }}>{a.name}</span></span><span className="amt num">{vis(bal[a.id] || 0)}</span></div>)}</div>
          </section>
          <Link href="/ask" className="card askcta">
            <span className="ti"><Icon name="ai" /></span>
            <span><b>Ask Grow</b><span className="muted small" style={{ display: 'block' }}>“Where did my money go this month?”</span></span>
            <Icon name="chev" />
          </Link>
          <section className="card">
            <div className="sec-h" style={{ margin: '0 0 4px' }}><h3>Recent</h3><Link className="link" href="/history">See all</Link></div>
            <div className="list">{rec.length ? rec.map(t => <TxRow key={t.id} S={S} t={t} showDate />) : <Empty title="Nothing here yet">Tap + to add your first income or expense.</Empty>}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
