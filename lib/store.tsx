'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cleanBackup, makeEmpty, type State, type Tx } from './data';

const KEY = 'grow.web.v2';
const LEGACY_KEY = 'grow.v1';

export type SheetSpec =
  | { kind: 'tx'; tx?: Partial<Tx> & { id?: string } }
  | { kind: 'hold'; id?: string }
  | { kind: 'settings' }
  | { kind: 'loan' } | { kind: 'card' } | { kind: 'invest' }
  | { kind: 'restore'; data: State };

interface Ctx {
  S: State; ready: boolean;
  update: (fn: (s: State) => State) => void;
  replace: (s: State) => void;
  toast: (msg: string) => void;
  sheet: SheetSpec | null;
  openSheet: (s: SheetSpec) => void;
  closeSheet: () => void;
}
const GrowCtx = createContext<Ctx | null>(null);

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.v === 2 && Array.isArray(o.txs) && Array.isArray(o.accounts)) return { ...makeEmpty(), ...o }; }
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) { const o = JSON.parse(old); const c = cleanBackup(o); if (c) return { ...c, sample: !!o.sample, entered: !!o.entered }; }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return makeEmpty();
}

export function GrowProvider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<State>(makeEmpty);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setS(load()); setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* quota or private mode */ } } }, [S, ready]);

  const toast = useCallback((m: string) => {
    setMsg(m); if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  const update = useCallback((fn: (s: State) => State) => setS(fn), []);
  const replace = useCallback((s: State) => setS(s), []);
  const openSheet = useCallback((s: SheetSpec) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    document.body.classList.toggle('noscroll', !!sheet);
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const value = useMemo(() => ({ S, ready, update, replace, toast, sheet, openSheet, closeSheet }), [S, ready, update, replace, toast, sheet, openSheet, closeSheet]);
  return (
    <GrowCtx.Provider value={value}>
      {children}
      {msg && <div id="toast" role="status">{msg}</div>}
    </GrowCtx.Provider>
  );
}

export function useGrow() {
  const c = useContext(GrowCtx);
  if (!c) throw new Error('useGrow outside GrowProvider');
  return c;
}

export function downloadFile(filename: string, data: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime + ';charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
