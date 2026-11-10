'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BUCKET_COLOR, CATS, HTYPES, pad, uid, type HoldingType, type Tx, type TxType } from '@/lib/data';
import { accName, allocation, avgMonthly, catTotals, emi, money, moneyT, monthTx, nowKey, nowLocal, shiftMonth, toPaisa, toTakaStr } from '@/lib/calc';
import { displayName, downloadFile, useGrow, type SheetSpec } from '@/lib/store';
import { Avatar, Icon, SYNC_LABEL } from './ui';

function Sheet({ title, children }: { title: string; children: ReactNode }) {
  const { closeSheet } = useGrow();
  return (
    <>
      <div className="scrim" onClick={closeSheet} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sheet-h"><h2>{title}</h2><button className="iconbtn" onClick={closeSheet} aria-label="Close"><Icon name="x" /></button></div>
        {children}
      </section>
    </>
  );
}

/* ---------- transaction ---------- */
function TxSheet({ tx }: { tx?: Partial<Tx> }) {
  const { S, update, closeSheet, toast } = useGrow();
  const pick = (pref: string) => (S.accounts.find(a => a.id === pref) || S.accounts[0])?.id ?? 'cash';
  const [d, setD] = useState(() => ({
    id: tx?.id, type: (tx?.type ?? 'expense') as TxType, date: tx?.date ?? nowLocal(), account: tx?.account ?? pick('cash'),
    to: tx?.to ?? '', cat: tx?.cat ?? 'Food', sub: tx?.sub ?? 'Groceries', amount: tx?.amount ? toTakaStr(tx.amount) : '', note: tx?.note ?? '',
  }));
  const [err, setErr] = useState(''); const [confirm, setConfirm] = useState(false);
  const tr = d.type === 'transfer';
  const kt = (tr ? 'expense' : d.type) as 'income' | 'expense';
  const cats = tr ? [] : Object.keys(CATS[kt]);
  const cat = tr ? '' : (CATS[kt][d.cat] ? d.cat : cats[0]);
  const subs: string[] = tr ? [] : CATS[kt][cat].subs;
  const sub = tr ? '' : (subs.includes(d.sub) ? d.sub : subs[0]);
  const to = tr ? (d.to && d.to !== d.account ? d.to : (S.accounts.find(a => a.id !== d.account)?.id ?? '')) : '';
  const set = (p: Partial<typeof d>) => setD(x => ({ ...x, ...p }));
  const setType = (t: TxType) => {
    if (t === 'transfer') set({ type: t });
    else { const c = Object.keys(CATS[t])[0]; set({ type: t, cat: c, sub: CATS[t][c].subs[0], account: pick(t === 'income' ? 'bank' : 'cash') }); }
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = toPaisa(d.amount);
    if (!(amt > 0)) return setErr('Enter an amount greater than zero.');
    if (!d.date) return setErr('Pick a date and time.');
    if (tr && (!to || to === d.account)) return setErr('Choose two different accounts for a transfer.');
    const rec: Tx = { id: d.id || uid(), type: d.type, date: d.date.slice(0, 16), account: d.account, to: tr ? to : '', cat, sub, amount: amt, note: d.note.trim() };
    update(s => { const i = s.txs.findIndex(x => x.id === rec.id); const txs = s.txs.slice(); if (i >= 0) txs[i] = rec; else txs.push(rec); return { ...s, txs }; });
    closeSheet(); toast(d.id ? 'Entry updated' : 'Entry added');
  };
  const del = () => {
    if (!confirm) return setConfirm(true);
    update(s => ({ ...s, txs: s.txs.filter(x => x.id !== d.id) })); closeSheet(); toast('Entry deleted');
  };
  const accOpts = S.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>);
  return (
    <Sheet title={d.id ? 'Edit entry' : 'Add entry'}>
      <form onSubmit={save} noValidate>
        <div className="tt" role="group" aria-label="Entry type">
          {(['income', 'expense', 'transfer'] as TxType[]).map(v => <button key={v} type="button" data-v={v} aria-pressed={d.type === v} onClick={() => setType(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        </div>
        <div className="f"><label htmlFor="f-date">Date</label><input id="f-date" type="datetime-local" value={d.date} max={nowLocal()} onChange={e => set({ date: e.target.value })} /></div>
        <div className="f"><label htmlFor="f-acc">{tr ? 'From' : 'Account'}</label><select id="f-acc" value={d.account} onChange={e => set({ account: e.target.value })}>{accOpts}</select></div>
        {tr
          ? <div className="f"><label htmlFor="f-to">To</label><select id="f-to" value={to} onChange={e => set({ to: e.target.value })}>{accOpts}</select></div>
          : <>
            <div className="f"><label htmlFor="f-cat">Category</label><select id="f-cat" value={cat} onChange={e => set({ cat: e.target.value, sub: CATS[kt][e.target.value].subs[0] })}>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="f"><label htmlFor="f-sub">Subcategory</label><select id="f-sub" value={sub} onChange={e => set({ sub: e.target.value })}>{subs.map(c => <option key={c}>{c}</option>)}</select></div>
          </>}
        <div className="f"><label htmlFor="f-amt">Amount (৳)</label><input id="f-amt" className="big" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={d.amount} onChange={e => set({ amount: e.target.value })} autoFocus={!d.id} /></div>
        <div className="f"><label htmlFor="f-note">Note</label><input id="f-note" type="text" maxLength={200} placeholder="What was it for?" value={d.note} onChange={e => set({ note: e.target.value })} /></div>
        <div className="err" role="alert">{err}</div>
        <div className="actions">
          <button className="btn full" type="submit">Save</button>
          {d.id && <button className="btn danger full" type="button" onClick={del}>{confirm ? 'Tap again to delete' : 'Delete entry'}</button>}
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- holding ---------- */
function HoldSheet({ id }: { id?: string }) {
  const { S, update, closeSheet, toast } = useGrow();
  const h0 = S.holdings.find(h => h.id === id);
  const [name, setName] = useState(h0?.name ?? ''); const [type, setType] = useState<HoldingType>(h0?.type ?? 'Stocks');
  const [inv, setInv] = useState(h0 ? toTakaStr(h0.invested) : ''); const [val, setVal] = useState(h0 ? toTakaStr(h0.value) : '');
  const [err, setErr] = useState(''); const [confirm, setConfirm] = useState(false);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const i = toPaisa(inv), v = toPaisa(val);
    if (!name.trim()) return setErr('Give this investment a name.');
    if (!(i >= 0) || !(v >= 0)) return setErr('Enter the amount invested and its value today.');
    const rec = { id: id || uid(), name: name.trim(), type, invested: i, value: v };
    update(s => { const hs = s.holdings.slice(); const k = hs.findIndex(x => x.id === rec.id); if (k >= 0) hs[k] = rec; else hs.push(rec); return { ...s, holdings: hs }; });
    closeSheet(); toast('Investment saved');
  };
  const del = () => { if (!confirm) return setConfirm(true); update(s => ({ ...s, holdings: s.holdings.filter(x => x.id !== id) })); closeSheet(); toast('Investment removed'); };
  return (
    <Sheet title={id ? 'Edit investment' : 'Add investment'}>
      <form onSubmit={save} noValidate>
        <div className="f"><label htmlFor="h-name">Name</label><input id="h-name" type="text" maxLength={200} placeholder="e.g. Equity mutual fund" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="f"><label htmlFor="h-type">Type</label><select id="h-type" value={type} onChange={e => setType(e.target.value as HoldingType)}>{Object.keys(HTYPES).map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="f"><label htmlFor="h-inv">Invested (৳)</label><input id="h-inv" className="big" type="number" inputMode="decimal" min="0" value={inv} onChange={e => setInv(e.target.value)} /></div>
        <div className="f"><label htmlFor="h-val">Value now (৳)</label><input id="h-val" className="big" type="number" inputMode="decimal" min="0" value={val} onChange={e => setVal(e.target.value)} /></div>
        <div className="err" role="alert">{err}</div>
        <div className="actions">
          <button className="btn full" type="submit">Save</button>
          {id && <button className="btn danger full" type="button" onClick={del}>{confirm ? 'Tap again to delete' : 'Remove investment'}</button>}
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- settings ---------- */
function SettingsSheet() {
  const { S, user, sync, update, closeSheet, toast, signOut } = useGrow();
  const router = useRouter();
  const [ob, setOb] = useState<Record<string, string>>(() => Object.fromEntries(S.accounts.map(a => [a.id, a.open ? String(a.open / 100) : ''])));
  const [armed, setArmed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const arm = (k: string, fn: () => void) => { if (armed !== k) return setArmed(k); setArmed(null); fn(); };
  const name = displayName(user);
  const avatar = (user?.user_metadata as Record<string, string> | undefined)?.avatar_url;
  const viaGoogle = user?.app_metadata?.provider === 'google' || (user?.identities ?? []).some(i => i.provider === 'google');
  const csv = () => {
    const q = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Date', 'Type', 'Category', 'Subcategory', 'Account', 'To account', 'Amount', 'Note']]
      .concat(S.txs.slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date.replace('T', ' '), t.type, t.cat, t.sub, accName(S, t.account), t.to ? accName(S, t.to) : '', String(t.amount / 100), t.note]));
    const d = new Date();
    downloadFile(`grow-transactions-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`, rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv'); toast('CSV downloaded');
  };
  const saveOB = () => {
    const bad = S.accounts.find(a => ob[a.id] && !isFinite(parseFloat(ob[a.id])));
    if (bad) return toast(`Check the amount for ${bad.name}`);
    update(s => ({ ...s, accounts: s.accounts.map(a => ({ ...a, open: ob[a.id] ? toPaisa(ob[a.id]) : 0 })) }));
    closeSheet(); toast('Balances saved');
  };
  const out = async () => { setBusy(true); await signOut(); closeSheet(); router.replace('/welcome'); };
  return (
    <Sheet title="Settings">
      <div className="acct">
        <Avatar name={name} url={avatar} size={44} />
        <div className="mid"><b>{name}</b><span className="muted small">{user?.email}{viaGoogle ? ' · Google' : ''}</span><span className={'syncdot ' + sync}>{SYNC_LABEL[sync]}</span></div>
      </div>

      <div className="lbl" style={{ margin: '18px 0 2px' }}>Opening balances</div>
      {S.accounts.map(a => <div className="f" key={a.id}><label htmlFor={'ob-' + a.id}>{a.name}</label><input id={'ob-' + a.id} className="big" type="number" inputMode="decimal" placeholder="0" value={ob[a.id] ?? ''} onChange={e => setOb(o => ({ ...o, [a.id]: e.target.value }))} /></div>)}
      <p className="note" style={{ marginTop: 6 }}>What each account held before your first entry. Balances and net worth are built from these plus your entries.</p>
      <div className="actions"><button className="btn full" onClick={saveOB}>Save balances</button></div>

      <div className="lbl" style={{ margin: '22px 0 8px' }}>Your data</div>
      <p className="note">Everything is saved to your Grow account and syncs to any device you log in on.</p>
      <div className="actions"><button className="btn ghost full" onClick={csv} disabled={!S.txs.length}>Export entries as CSV</button></div>

      <div className="lbl" style={{ margin: '22px 0 4px' }}>About</div>
      <p className="note">Grow 2.0. Ask Grow answers from a built-in money guide using your own numbers. Grow gives general information, not financial, tax or legal advice. <a className="link" href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>

      <div className="actions" style={{ marginTop: 18 }}>
        <button className="btn ghost full" onClick={out} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>
        <button className="btn danger full" onClick={() => arm('erase', () => {
          update(s => ({ ...s, txs: [], holdings: [], budgets: {}, accounts: s.accounts.map(a => ({ ...a, open: 0 })) }));
          closeSheet(); toast('All entries erased');
        })}>{armed === 'erase' ? 'Tap again: erase all entries, investments and budgets' : 'Erase all my data'}</button>
      </div>
    </Sheet>
  );
}

/* ---------- tools (calculator inputs are in taka) ---------- */
function LoanSheet() {
  const { S } = useGrow();
  const inc = avgMonthly(S).income / 100;
  const [amt, setAmt] = useState('500000'); const [yrs, setYrs] = useState('3'); const [fee, setFee] = useState('1');
  const [offers, setOffers] = useState([['Option A', '10.5'], ['Option B', '11.5'], ['Option C', '12.5']]);
  const p = parseFloat(amt), y = parseFloat(yrs), f = parseFloat(fee) || 0;
  const res = useMemo(() => offers.map(([n, r], i) => ({ n: n || `Option ${i + 1}`, r: parseFloat(r) })).filter(o => o.r >= 0).map(o => {
    const m = emi(p, o.r, y), n = Math.round(y * 12), interest = m * n - p, fe = p * f / 100;
    return { ...o, m, interest, fee: fe, total: interest + fe };
  }).sort((a, b) => a.total - b.total), [offers, p, y, f]);
  const ok = p > 0 && y > 0;
  return (
    <Sheet title="Loan finder">
      <p className="note">Enter the quotes you have received. The three rows hold example rates. Replace them with what each bank actually offers you.</p>
      <div className="f" style={{ marginTop: 8 }}><label htmlFor="l-amt">Amount (৳)</label><input id="l-amt" className="big" type="number" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value)} /></div>
      <div className="f"><label htmlFor="l-yrs">Years</label><input id="l-yrs" className="big" type="number" inputMode="decimal" step="0.5" value={yrs} onChange={e => setYrs(e.target.value)} /></div>
      <div className="f"><label htmlFor="l-fee">Fee (%)</label><input id="l-fee" type="number" inputMode="decimal" step="0.1" value={fee} onChange={e => setFee(e.target.value)} /></div>
      <div style={{ marginTop: 12 }}>
        {offers.map((o, i) => <div className="loanrow" key={i}>
          <input type="text" value={o[0]} aria-label={`Offer ${i + 1} name`} onChange={e => setOffers(x => x.map((r, j) => j === i ? [e.target.value, r[1]] : r))} />
          <input type="number" inputMode="decimal" step="0.05" value={o[1]} aria-label={`Offer ${i + 1} yearly rate, percent`} placeholder="Rate % a year" onChange={e => setOffers(x => x.map((r, j) => j === i ? [r[0], e.target.value] : r))} />
        </div>)}
      </div>
      <div className="res">
        {!ok ? <p className="note">Enter an amount and a number of years.</p> : !res.length ? <p className="note">Enter at least one yearly rate.</p> : <>
          {res.map((o, i) => <div key={i} className={'opt' + (i === 0 ? ' best' : '')}>
            <b>{o.n} · {o.r}%</b><b className="num">{moneyT(o.m)}<span className="muted small"> / month</span></b>
            <span className="small muted">Interest {moneyT(o.interest)} + fee {moneyT(o.fee)}</span><span className="small num">Total cost {moneyT(o.total)}{i === 0 ? ' · lowest' : ''}</span>
          </div>)}
          {inc > 0 && <p className="note">{res[0].m / inc > 0.4 && <b className="exp">Heads up: </b>}The lowest payment is about <b>{Math.round(res[0].m / inc * 100)}%</b> of your average monthly income. Planners often like to see debt payments under roughly 40%.</p>}
          <p className="note">Ask each bank: is the rate fixed or floating, what are the processing and early-repayment fees, and what is the all-in cost per year? Confirm today&apos;s quote before deciding.</p>
        </>}
      </div>
    </Sheet>
  );
}

const CARD_PERKS: Record<string, string[]> = {
  dining: ['Dining or restaurant partner discounts', 'Cashback on grocery and supermarket spend', 'Low or waived annual fee when you reach a spend target'],
  online: ['Cashback or points on online purchases', '0% instalment plans with partner merchants', 'Strong fraud protection and easy dispute handling'],
  travel: ['Airport lounge access', 'Miles or travel points with a transfer option', 'Travel insurance and a low foreign-currency markup'],
  fuel: ['Fuel surcharge waiver or fuel cashback', 'Rewards on ride-sharing and transport apps', 'Simple flat cashback, since this spend is steady'],
};
function CardSheet() {
  const { S } = useGrow();
  const a = avgMonthly(S);
  const last = monthTx(S, shiftMonth(nowKey(), -1)), top = catTotals(last.length ? last : monthTx(S, nowKey()), 'expense')[0];
  const [use, setUse] = useState(top?.[0] === 'Transport' ? 'fuel' : top?.[0] === 'Food' ? 'dining' : 'online');
  const [spend, setSpend] = useState(String(Math.max(5000, Math.round(a.expense / 100 * 0.4 / 1000) * 1000)));
  const [fee, setFee] = useState('2000');
  const [c, setC] = useState({ ra: '1', rb: '2', fa: '0', fb: '3000' });
  const sp = parseFloat(spend) || 0, fe = +fee;
  const na = sp * 12 * (+c.ra || 0) / 100 - (+c.fa || 0), nb = sp * 12 * (+c.rb || 0) / 100 - (+c.fb || 0), win = na >= nb ? 'A' : 'B';
  return (
    <Sheet title="Card matcher">
      <div className="f"><label htmlFor="c-use">Mostly for</label><select id="c-use" value={use} onChange={e => setUse(e.target.value)}><option value="dining">Dining and groceries</option><option value="online">Online shopping</option><option value="travel">Travel</option><option value="fuel">Fuel and transport</option></select></div>
      <div className="f"><label htmlFor="c-spend">Card spend / month (৳)</label><input id="c-spend" className="big" type="number" inputMode="numeric" value={spend} onChange={e => setSpend(e.target.value)} /></div>
      <div className="f"><label htmlFor="c-fee">Fee tolerance</label><select id="c-fee" value={fee} onChange={e => setFee(e.target.value)}><option value="0">No annual fee</option><option value="2000">Up to ৳2,000</option><option value="5000">Up to ৳5,000</option><option value="99999">Fee is fine if rewards are strong</option></select></div>
      <div className="res">
        <div className="card flat" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}><div className="lbl" style={{ color: 'var(--accent)' }}>Look for</div><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{CARD_PERKS[use].map(x => <li key={x}>{x}</li>)}</ul></div>
        <p className="note">{fe === 0 ? 'You want no annual fee, so look for lifetime-free cards and check how much lower their reward rates are.' : `Your fee limit is ${fe >= 99999 ? 'open' : moneyT(fe)}. Divide the annual fee by your yearly spend (${moneyT(sp * 12)}) to see the reward rate you need to break even.`} Pay the full bill every month: card interest costs far more than most rewards earn.</p>
      </div>
      <div className="lbl" style={{ margin: '16px 0 6px' }}>Compare two cards you are considering</div>
      <div className="cmp">
        <span /><b>Card A</b><b>Card B</b>
        <span>Reward %</span><input type="number" step="0.1" inputMode="decimal" value={c.ra} aria-label="Card A reward percent" onChange={e => setC({ ...c, ra: e.target.value })} /><input type="number" step="0.1" inputMode="decimal" value={c.rb} aria-label="Card B reward percent" onChange={e => setC({ ...c, rb: e.target.value })} />
        <span>Fee ৳/yr</span><input type="number" inputMode="numeric" value={c.fa} aria-label="Card A annual fee" onChange={e => setC({ ...c, fa: e.target.value })} /><input type="number" inputMode="numeric" value={c.fb} aria-label="Card B annual fee" onChange={e => setC({ ...c, fb: e.target.value })} />
      </div>
      <div className="res">
        {([['A', na, c.ra, c.fa], ['B', nb, c.rb, c.fb]] as const).map(([k, n, r, f]) => <div key={k} className={'opt' + (win === k ? ' best' : '')}>
          <b>Card {k}</b><b className={'num ' + (n >= 0 ? 'inc' : 'exp')}>{moneyT(n)} / year</b><span className="small muted">{moneyT(sp * 12 * (+r || 0) / 100)} rewards − {moneyT(+f || 0)} fee</span>
        </div>)}
      </div>
      <p className="note" style={{ marginTop: 10 }}>The reward and fee boxes hold example numbers. Use the real terms from each issuer.</p>
    </Sheet>
  );
}

const PROFILES: Record<string, Record<string, number>> = {
  Cautious: { 'Cash': 20, 'Fixed income': 50, 'Mutual funds': 12, 'Stocks': 5, 'Gold': 10, 'Other': 3 },
  Balanced: { 'Cash': 10, 'Fixed income': 35, 'Mutual funds': 25, 'Stocks': 20, 'Gold': 10, 'Other': 0 },
  Growth: { 'Cash': 5, 'Fixed income': 20, 'Mutual funds': 30, 'Stocks': 35, 'Gold': 10, 'Other': 0 },
};
function InvestSheet() {
  const { S } = useGrow();
  const [risk, setRisk] = useState('Balanced'); const [hor, setHor] = useState('l');
  const T = { ...PROFILES[risk] };
  if (hor === 's') { const sh = Math.min(T['Stocks'], 15); T['Stocks'] -= sh; T['Fixed income'] += sh; }
  const al = allocation(S), tot = Object.values(al).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.keys(BUCKET_COLOR).map(k => ({ k, cur: (al[k] || 0) / tot * 100, tar: T[k] || 0 }));
  const gaps = rows.filter(r => Math.abs(r.cur - r.tar) >= 8).sort((a, b) => Math.abs(b.cur - b.tar) - Math.abs(a.cur - a.tar)).slice(0, 3);
  return (
    <Sheet title="Invest planner">
      <div className="f"><label htmlFor="i-risk">Comfort with ups and downs</label><select id="i-risk" value={risk} onChange={e => setRisk(e.target.value)}><option>Cautious</option><option>Balanced</option><option>Growth</option></select></div>
      <div className="f"><label htmlFor="i-hor">Money needed in</label><select id="i-hor" value={hor} onChange={e => setHor(e.target.value)}><option value="s">Under 3 years</option><option value="m">3 to 7 years</option><option value="l">7 years or more</option></select></div>
      <div className="res">
        <div className="card flat">
          {rows.map(r => <div key={r.k} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><b>{r.k}</b><span className="num">{Math.round(r.cur)}% now · {r.tar}% target</span></div>
            <div className="bar" style={{ marginTop: 5 }}><i style={{ width: Math.min(100, r.cur) + '%', background: BUCKET_COLOR[r.k] }} /></div>
            <div className="bar" style={{ height: 4, marginTop: 3, opacity: .6 }}><i style={{ width: r.tar + '%', background: 'var(--ink)' }} /></div>
          </div>)}
          <div className="key"><span><i style={{ background: 'var(--accent)' }} />Now</span><span><i style={{ background: 'var(--ink)' }} />Target</span></div>
        </div>
        {gaps.length ? <><p><b>Biggest gaps</b></p><ul style={{ margin: 0, paddingLeft: 18 }}>{gaps.map(g => <li key={g.k}>{g.k} is {Math.round(g.cur)}% against a {g.tar}% target ({g.cur > g.tar ? 'above' : 'below'}).</li>)}</ul></> : <p>Your mix is close to this target.</p>}
        <p className="note">Cash counts every account balance. Targets are simple rules of thumb for learning, not advice for your situation. Check the fees, taxes, lock-in periods and risks of each product, and consider speaking with a licensed adviser.</p>
      </div>
    </Sheet>
  );
}

export function SheetHost() {
  const { sheet } = useGrow();
  if (!sheet) return null;
  const s = sheet as SheetSpec;
  const k = JSON.stringify({ kind: s.kind, id: 'tx' in s ? s.tx?.id : 'id' in s ? s.id : undefined });
  switch (s.kind) {
    case 'tx': return <TxSheet key={k} tx={s.tx} />;
    case 'hold': return <HoldSheet key={k} id={s.id} />;
    case 'settings': return <SettingsSheet />;
    case 'loan': return <LoanSheet />;
    case 'card': return <CardSheet />;
    case 'invest': return <InvestSheet />;
  }
}
