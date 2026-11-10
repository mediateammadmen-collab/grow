'use client';
import { useEffect, useRef, useState } from 'react';
import { answer, entriesByTopic, parseQuick, questionFor, STARTERS, TOPICS, type Quick, type Tool, type Topic } from '@/lib/guide';
import { accName, catTotals, checkup, money, monthTx, nowKey, nowLocal, sum } from '@/lib/calc';
import { uid, type State } from '@/lib/data';
import { useGrow } from '@/lib/store';
import { Icon, Md } from '../ui';

interface Msg {
  id: string; role: 'user' | 'bot'; text: string; shown: number;
  phase: 'think' | 'type' | 'done'; follow?: string[]; tool?: Tool; quick?: Quick; added?: boolean;
}
/* Kept at module level so the conversation survives switching tabs. */
let CACHE: Msg[] = [];
let CACHE_USER: string | null = null;

const THINK = ['Reading your entries', 'Checking this month', 'Crunching the numbers', 'Comparing with your averages', 'Putting it together'];
const TOOL_LABEL: Record<Tool, string> = { loan: 'Open Loan finder', card: 'Open Card matcher', invest: 'Open Invest planner' };

function greeting() { const h = new Date().getHours(); return h < 5 ? 'Up late?' : h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.'; }

/* Close any half-typed **bold** or _italic_ so streaming text renders cleanly. */
function partial(t: string) {
  let s = t;
  if ((s.match(/\*\*/g) || []).length % 2) s += '**';
  if ((s.match(/(^|\s)_|_(\s|$|[.,])/g) || []).length % 2) s += '_';
  return s;
}

function insights(S: State): { text: string; ask: string; tone: 'good' | 'ok' | 'low' }[] {
  const out: { text: string; ask: string; tone: 'good' | 'ok' | 'low' }[] = [];
  const cur = monthTx(S, nowKey()), exp = sum(cur, 'expense'), top = catTotals(cur, 'expense')[0];
  if (top && exp) out.push({ text: `${top[0]} is ${Math.round(top[1] / exp * 100)}% of your spending this month`, ask: 'where', tone: 'ok' });
  const c = checkup(S);
  if (c.cnt) out.push(c.over ? { text: `${c.over} budget categor${c.over === 1 ? 'y is' : 'ies are'} over the limit`, ask: 'budget', tone: 'low' } : { text: 'Every budget category is within its limit', ask: 'budget', tone: 'good' });
  if (c.rate !== null) out.push({ text: `You keep about ${Math.round(c.rate * 100)}% of what you earn`, ask: 'rate', tone: c.rate >= 0.2 ? 'good' : c.rate >= 0.1 ? 'ok' : 'low' });
  if (c.em !== null && out.length < 3) out.push({ text: `Your savings cover ${c.em.toFixed(1)} months of spending`, ask: 'emergency', tone: c.em >= 6 ? 'good' : c.em >= 3 ? 'ok' : 'low' });
  return out.slice(0, 3);
}

export function AskView() {
  const { S, update, openSheet, toast, user } = useGrow();
  if (CACHE_USER !== (user?.id ?? null)) { CACHE = []; CACHE_USER = user?.id ?? null; }
  const [msgs, setMsgs] = useState<Msg[]>(CACHE);
  const [input, setInput] = useState('');
  const [thinkIdx, setThinkIdx] = useState(0);
  const [topic, setTopic] = useState<Topic | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = msgs.some(m => m.phase !== 'done');

  useEffect(() => { CACHE = msgs; }, [msgs]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [msgs.length, msgs[msgs.length - 1]?.phase]);

  const patch = (id: string, p: Partial<Msg>) => setMsgs(ms => ms.map(m => m.id === id ? { ...m, ...p } : m));
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  function stream(id: string, text: string) {
    // Reveal a few words at a time, a little faster for long answers.
    const words = text.split(/(\s+)/); let i = 0;
    const step = Math.max(2, Math.round(words.length / 70));
    const tick = () => {
      i = Math.min(words.length, i + step);
      const shown = words.slice(0, i).join('').length;
      if (i >= words.length) { patch(id, { shown: text.length, phase: 'done' }); return; }
      patch(id, { shown }); later(tick, 28 + Math.random() * 30);
    };
    patch(id, { phase: 'type', shown: 0 }); tick();
  }

  function ask(raw: string, forcedId?: string) {
    const text = raw.trim(); if (!text || busy) return;
    const u: Msg = { id: uid(), role: 'user', text, shown: text.length, phase: 'done' };
    const q = forcedId ? null : parseQuick(S, text);
    if (q) {
      const bid = uid(), t = 'Got it. Here’s what I picked up. Should I add it?';
      setMsgs(ms => [...ms, u, { id: bid, role: 'bot', text: t, shown: 0, phase: 'think', quick: q }]);
      setThinkIdx(0);
      later(() => stream(bid, t), 450);
      return;
    }
    const r = answer(S, text, forcedId);
    const bid = uid();
    setMsgs(ms => [...ms, u, { id: bid, role: 'bot', text: r.text, shown: 0, phase: 'think', follow: r.follow, tool: r.tool }]);
    setThinkIdx(Math.floor(Math.random() * THINK.length));
    const wait = 650 + Math.min(900, r.text.length * 1.2) + Math.random() * 300;
    later(() => setThinkIdx(i => (i + 1) % THINK.length), wait / 2);
    later(() => stream(bid, r.text), wait);
  }

  function skip() {
    timers.current.forEach(clearTimeout); timers.current = [];
    setMsgs(ms => ms.map(m => m.phase === 'done' ? m : { ...m, shown: m.text.length, phase: 'done' }));
  }

  function addQuick(m: Msg, edit: boolean) {
    if (!m.quick || m.added) return;
    const q = m.quick;
    patch(m.id, { added: true });
    if (edit) { openSheet({ kind: 'tx', tx: { type: q.type, date: nowLocal(), account: q.account, cat: q.cat, sub: q.sub, amount: q.amount, note: q.note } }); return; }
    update(s => ({ ...s, txs: [...s.txs, { id: uid(), type: q.type, date: nowLocal(), account: q.account, to: '', cat: q.cat, sub: q.sub, amount: q.amount, note: q.note }] }));
    toast(q.type === 'income' ? 'Income added' : 'Expense added');
  }

  const ins = insights(S);
  const chk = checkup(S);

  return (
    <div className="ask">
      <header className="head" style={{ marginBottom: 6 }}>
        <h1>Ask Grow</h1>
        {msgs.length > 0 && <button className="btn ghost sm" onClick={() => { skip(); setMsgs([]); }}><Icon name="refresh" /> New chat</button>}
      </header>

      {!msgs.length && <div className="stack ask-intro">
        <div className="orbrow"><span className="orb" aria-hidden="true"><Icon name="ai" /></span>
          <div><p className="hi">{greeting()}</p><p className="muted">What would you like to know about your money?</p></div></div>

        {ins.length > 0 && <div className="insights">
          {ins.map(x => <button key={x.ask} className={'insight ' + x.tone} onClick={() => ask(questionFor(x.ask), x.ask)}>
            <span className="lbl">Noticed</span><span>{x.text}</span><span className="link small">Tell me more →</span>
          </button>)}
        </div>}

        <div className="chips">{STARTERS.map(id => <button key={id} className="chip" onClick={() => ask(questionFor(id), id)}>{questionFor(id)}</button>)}</div>

        <div className="tools">
          <button className="tool" onClick={() => openSheet({ kind: 'loan' })}><span className="ti"><Icon name="loan" /></span><b>Loan finder</b><span>Compare offers by real cost</span></button>
          <button className="tool" onClick={() => openSheet({ kind: 'card' })}><span className="ti"><Icon name="card" /></span><b>Card matcher</b><span>Find a card that fits your spending</span></button>
          <button className="tool" onClick={() => openSheet({ kind: 'invest' })}><span className="ti"><Icon name="chart" /></span><b>Invest planner</b><span>See your mix against a target</span></button>
        </div>

        <section className="card"><h3>Browse topics</h3>
          <div className="chips" style={{ marginTop: 10 }}>{TOPICS.map(t => <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)}>{t}</button>)}</div>
          {topic && <div className="list" style={{ marginTop: 8 }}>{entriesByTopic(topic).map(e => <button key={e.id} className="row" onClick={() => ask(e.q, e.id)}><span className="mid"><span className="t" style={{ display: 'block', whiteSpace: 'normal' }}>{e.q}</span></span><Icon name="chev" /></button>)}</div>}
        </section>

        {(chk.em !== null || chk.rate !== null || chk.cnt > 0) && <section className="card"><h3>Money check-up</h3>
          <div style={{ marginTop: 8 }}>
            {chk.em !== null && <Check label="Emergency fund" pct={chk.em / 6 * 100} level={chk.em >= 6 ? 'good' : chk.em >= 3 ? 'ok' : 'low'} note={`${chk.em.toFixed(1)} months of spending in cash and accounts (aim for 6)`} />}
            {chk.rate !== null && <Check label="Savings rate" pct={chk.rate / .3 * 100} level={chk.rate >= .2 ? 'good' : chk.rate >= .1 ? 'ok' : 'low'} note={`${Math.round(chk.rate * 100)}% of income kept (aim for 20%+)`} />}
            {chk.cnt > 0 && <Check label="Budget" pct={(chk.cnt - chk.over) / chk.cnt * 100} level={chk.over === 0 ? 'good' : chk.over <= 2 ? 'ok' : 'low'} note={chk.over === 0 ? 'Every category is within its limit this month' : `${chk.over} of ${chk.cnt} categories over limit this month`} />}
          </div>
        </section>}
      </div>}

      <div className="chat" aria-live="polite">
        {msgs.map((m, i) => m.role === 'user'
          ? <div key={m.id} className="msg user">{m.text}</div>
          : <div key={m.id} className="botrow">
            <span className="orb sm" aria-hidden="true"><Icon name="ai" /></span>
            <div className={'msg bot' + (m.phase === 'type' ? ' typing' : '')}>
              {m.phase === 'think'
                ? <span className="thinking"><span className="think"><i /><i /><i /></span><span className="shimmer">{THINK[thinkIdx]}…</span></span>
                : <Md text={m.phase === 'done' ? m.text : partial(m.text.slice(0, m.shown))} />}
              {m.phase === 'done' && m.quick && <div className="quick">
                <div className="lbl">{m.quick.type === 'income' ? 'Income' : 'Expense'} · {m.quick.cat} · {accName(S, m.quick.account)}</div>
                <div className={'qv num ' + (m.quick.type === 'income' ? 'inc' : 'exp')}>{money(m.quick.amount)}</div>
                <div className="small muted">{m.quick.note}</div>
                {m.added ? <div className="inc small"><b>Added.</b></div> : <div className="qa"><button className="btn sm" onClick={() => addQuick(m, false)}>Add it</button><button className="btn ghost sm" onClick={() => addQuick(m, true)}>Edit first</button></div>}
              </div>}
              {m.phase === 'done' && m.tool && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => openSheet({ kind: m.tool! })}>{TOOL_LABEL[m.tool]}</button>}
              {m.phase === 'done' && i === msgs.length - 1 && m.follow && m.follow.length > 0 && <div className="follow">
                <span className="lbl">Ask next</span>
                <div className="chips">{m.follow.map(id => <button key={id} className="chip sm" onClick={() => ask(questionFor(id), id)}>{questionFor(id)}</button>)}</div>
              </div>}
            </div>
          </div>)}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={e => { e.preventDefault(); if (busy) { skip(); return; } const v = input; setInput(''); ask(v); }}>
        <input type="text" autoComplete="off" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything, or add “spent 450 on lunch”" aria-label="Message" />
        <button className="btn" type="submit" aria-label={busy ? 'Skip to the full answer' : 'Send'}><Icon name={busy ? 'stop' : 'send'} /></button>
      </form>
      <p className="note center" style={{ marginTop: 6 }}>Answers use your numbers on this device. General guidance, not financial advice.</p>
    </div>
  );
}

function Check({ label, pct, level, note }: { label: string; pct: number; level: 'good' | 'ok' | 'low'; note: string }) {
  return <div className="check">
    <div><b>{label}</b> <span className="muted small">{note}</span></div>
    <span className={'pill ' + level}>{{ good: 'Good', ok: 'Okay', low: 'Needs work' }[level]}</span>
    <div className={'bar ' + (level === 'low' ? 'bad' : level === 'ok' ? 'warn' : '')}><i style={{ width: Math.max(3, Math.min(100, pct)) + '%' }} /></div>
  </div>;
}
