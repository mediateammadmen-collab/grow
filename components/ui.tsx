'use client';
import { Fragment, type ReactNode } from 'react';
import { catColor, type State, type Tx } from '@/lib/data';
import { accName, compact, dayLabel, money, monthLabel } from '@/lib/calc';
import { useGrow, type SyncState } from '@/lib/store';

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  daily: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  ai: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.9A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  swap: <path d="M7 7h12l-3-3M17 17H5l3 3" />,
  send: <path d="M5 12l14-7-5 14-3-6z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  loan: <><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19M6 15h4" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16l4-5 3 3 5-7" /></>,
  chev: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>,
};
export type IconName = keyof typeof PATHS;
export function Icon({ name, className = 'ico' }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}

export function Donut({ items, total, center, sub }: { items: { v: number; c: string }[]; total: number; center: string; sub?: string }) {
  let off = 0;
  return (
    <svg className="donut" viewBox="0 0 42 42" role="img" aria-label="Breakdown chart">
      <circle r="15.9155" cx="21" cy="21" fill="none" stroke="var(--surface2)" strokeWidth="6.5" />
      {items.map((it, i) => {
        const p = total ? it.v / total * 100 : 0;
        const el = <circle key={i} r="15.9155" cx="21" cy="21" fill="none" stroke={it.c} strokeWidth="6.5" strokeDasharray={`${p.toFixed(3)} ${(100 - p).toFixed(3)}`} strokeDashoffset={(25 - off).toFixed(3)} />;
        off += p; return el;
      })}
      <text x="21" y="21.2" className="dc">{center}</text>
      <text x="21" y="25.6" className="ds">{sub}</text>
    </svg>
  );
}

function niceMax(v: number) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p; return 10 * p; }
export function BarChart({ months }: { months: { mk: string; inc: number; exp: number }[] }) {
  const max = niceMax(Math.max(100000, ...months.flatMap(m => [m.inc, m.exp])));
  const W = 340, H = 176, l = 36, b = 22, t = 10, r = 4, ph = H - t - b, gw = (W - l - r) / months.length, bw = Math.min(15, gw / 2 - 3);
  return (
    <>
      <svg className="bars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income and expenses by month">
        {[0, 1, 2, 3].map(i => { const y = t + ph * (1 - i / 3); return <Fragment key={i}><line className="gl" x1={l} x2={W - r} y1={y} y2={y} /><text className="ax" x={l - 5} y={y + 3.5} textAnchor="end">{compact(max * i / 3, false)}</text></Fragment>; })}
        {months.map((m, i) => {
          const cx = l + gw * (i + .5), hi = m.inc / max * ph, he = m.exp / max * ph;
          return <Fragment key={m.mk}>
            <rect className="b-inc" x={cx - bw - 1} y={t + ph - hi} width={bw} height={Math.max(hi, 0)} rx="3"><title>{`${monthLabel(m.mk)} income ${money(m.inc)}`}</title></rect>
            <rect className="b-exp" x={cx + 1} y={t + ph - he} width={bw} height={Math.max(he, 0)} rx="3"><title>{`${monthLabel(m.mk)} expenses ${money(m.exp)}`}</title></rect>
            <text className="ax" x={cx} y={H - 6} textAnchor="middle">{monthLabel(m.mk, true)}</text>
          </Fragment>;
        })}
      </svg>
      <div className="key"><span><i style={{ background: 'var(--inc)' }} />Income</span><span><i style={{ background: 'var(--exp)' }} />Expenses</span></div>
    </>
  );
}

/* Tiny markdown: **bold**, _italic_, "- " bullets (2-space nesting), "1. " numbered lists, blank-line paragraphs. */
function inline(s: string, k: string): ReactNode[] {
  const out: ReactNode[] = []; const re = /\*\*(.+?)\*\*|_(.+?)_/g; let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(m[1] ? <b key={k + i++}>{m[1]}</b> : <em key={k + i++} className="muted">{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
export function Md({ text }: { text: string }) {
  const blocks: ReactNode[] = []; const lines = text.split('\n'); let i = 0, key = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (!ln.trim()) { i++; continue; }
    const ol = /^\d+\.\s+/.test(ln), ul = /^-\s+/.test(ln);
    if (ol || ul) {
      const items: { t: string; sub: string[] }[] = [];
      while (i < lines.length) {
        const L = lines[i];
        if (items.length && /^\s{2,}-\s+/.test(L)) { items[items.length - 1].sub.push(L.replace(/^\s+-\s+/, '')); i++; continue; }
        if (ol ? /^\d+\.\s+/.test(L) : /^-\s+/.test(L)) { items.push({ t: L.replace(/^(\d+\.|-)\s+/, ''), sub: [] }); i++; continue; }
        break;
      }
      const kids = items.map((it, j) => <li key={j}>{inline(it.t, `l${key}-${j}-`)}{it.sub.length > 0 && <ul>{it.sub.map((s, z) => <li key={z}>{inline(s, `s${key}-${j}-${z}-`)}</li>)}</ul>}</li>);
      blocks.push(ol ? <ol key={key++}>{kids}</ol> : <ul key={key++}>{kids}</ul>);
      continue;
    }
    blocks.push(<p key={key++}>{inline(ln, `p${key}-`)}</p>);
    i++;
  }
  return <>{blocks}</>;
}

export function TxRow({ S, t, showDate }: { S: State; t: Tx; showDate?: boolean }) {
  const { openSheet } = useGrow();
  const name = t.note || t.sub || t.cat || 'Transfer';
  const sub = t.type === 'transfer' ? `${accName(S, t.account)} → ${accName(S, t.to)}` : `${t.cat}${t.sub && t.sub !== t.cat ? ' · ' + t.sub : ''} · ${accName(S, t.account)}`;
  const cls = t.type === 'income' ? 'inc' : t.type === 'expense' ? 'exp' : '';
  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '';
  return (
    <button className="row" onClick={() => openSheet({ kind: 'tx', tx: t })}>
      {t.type === 'transfer'
        ? <span className="sw" style={{ background: '#c8d3cd' }}><Icon name="swap" /></span>
        : <span className="sw" style={{ background: catColor(t) }}>{(t.cat || '?').charAt(0)}</span>}
      <span className="mid">
        <span className="t" style={{ display: 'block' }}>{name}</span>
        <span className="s" style={{ display: 'block' }}>{showDate ? dayLabel(t.date) + ' · ' : ''}{sub}</span>
      </span>
      <span className={`amt num ${cls}`}>{sign}{money(t.amount).replace('−', '')}</span>
    </button>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><b>{title}</b>{children}</div>;
}

export const SYNC_LABEL: Record<SyncState, string> = { saved: 'All changes saved', saving: 'Saving…', offline: 'Offline · saved on this device', error: 'Not synced yet · retrying' };

export function Avatar({ name, url, size = 34 }: { name: string; url?: string; size?: number }) {
  if (url) return <img className="avatar" src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" />;
  return <span className="avatar" style={{ width: size, height: size }}>{(name || '?').charAt(0).toUpperCase()}</span>;
}

