'use client';
/*
 * App state for the signed-in user.
 *
 * - Auth comes from Supabase. Signed out → no data, the app routes to /welcome.
 * - On sign-in we show the cached copy for that user (instant), then load from the database.
 * - Every change goes through `update`, which diffs old vs new state and writes only the changed
 *   rows. Writes run one after another. If one fails (offline, server error) the user is marked
 *   "dirty" and the full local copy is pushed again when the connection returns.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { makeEmpty, type State, type Tx } from './data';
import { supabase } from './supabase';
import { pull, pushAll, pushDiff } from './sync';

export type SheetSpec =
  | { kind: 'tx'; tx?: Partial<Tx> & { id?: string } }
  | { kind: 'hold'; id?: string }
  | { kind: 'settings' }
  | { kind: 'loan' } | { kind: 'card' } | { kind: 'invest' };

export type AuthState = 'loading' | 'out' | 'in';
export type SyncState = 'saved' | 'saving' | 'offline' | 'error';

interface Ctx {
  S: State;
  auth: AuthState;
  user: User | null;
  ready: boolean;            // data for the signed-in user is available
  loadError: string | null;  // set when the first load failed and there is no cached copy
  sync: SyncState;
  update: (fn: (s: State) => State) => void;
  replace: (s: State) => void;
  retryLoad: () => void;
  signOut: () => Promise<void>;
  toast: (msg: string) => void;
  sheet: SheetSpec | null;
  openSheet: (s: SheetSpec) => void;
  closeSheet: () => void;
}
const GrowCtx = createContext<Ctx | null>(null);

const cacheKey = (uid: string) => 'grow.cache.' + uid;
const dirtyKey = (uid: string) => 'grow.dirty.' + uid;
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* quota or private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
function readCache(uid: string): State | null {
  try {
    const raw = ls.get(cacheKey(uid)); if (!raw) return null;
    const o = JSON.parse(raw);
    return o && o.v === 2 && Array.isArray(o.txs) && Array.isArray(o.accounts) ? { ...makeEmpty(), ...o } : null;
  } catch { return null; }
}
export function displayName(u: User | null) {
  const m = (u?.user_metadata ?? {}) as Record<string, string>;
  return m.full_name || m.name || u?.email?.split('@')[0] || '';
}

export function GrowProvider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<State>(makeEmpty);
  const [auth, setAuth] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>('saved');
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const Sref = useRef(S);
  const uidRef = useRef<string | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const loadSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned = useRef(false);

  const toast = useCallback((m: string) => {
    setMsg(m); if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  const commit = useCallback((next: State) => {
    Sref.current = next; setS(next);
    if (uidRef.current) ls.set(cacheKey(uidRef.current), JSON.stringify(next));
  }, []);

  /* Queue a database write. Writes never overlap, and a failure marks the user dirty. */
  const enqueue = useCallback((job: (uid: string) => Promise<void>) => {
    const uid = uidRef.current; const sb = supabase();
    if (!uid || !sb) return;
    setSync('saving');
    chain.current = chain.current.then(async () => {
      if (uidRef.current !== uid) return;            // user changed while queued
      try {
        await job(uid);
        if (uidRef.current === uid) { setSync('saved'); warned.current = false; }
      } catch (e) {
        console.warn('Grow sync failed', e);
        ls.set(dirtyKey(uid), '1');
        if (uidRef.current === uid) {
          setSync(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
          if (!warned.current) { warned.current = true; toast('Saved on this device. Will sync when the connection is back.'); }
        }
      }
    });
  }, [toast]);

  const flushDirty = useCallback(() => {
    const uid = uidRef.current; const sb = supabase();
    if (!uid || !sb || !ls.get(dirtyKey(uid))) return;
    enqueue(async u => { await pushAll(sb, u, Sref.current); ls.del(dirtyKey(u)); });
  }, [enqueue]);

  /* Load (or reload) the signed-in user's data from the database. */
  const load = useCallback(async (uid: string) => {
    const sb = supabase(); if (!sb) return;
    const seq = ++loadSeq.current;
    setLoadError(null);
    try {
      if (ls.get(dirtyKey(uid)) && readCache(uid)) {
        await pushAll(sb, uid, readCache(uid)!);       // offline edits win over the server copy
        ls.del(dirtyKey(uid));
      }
      let server = await pull(sb);
      if (!server) {                                    // brand-new user with no rows yet
        server = makeEmpty();
        await pushAll(sb, uid, server);
      }
      if (seq !== loadSeq.current || uidRef.current !== uid) return;
      commit(server); setReady(true); setSync('saved');
    } catch (e) {
      if (seq !== loadSeq.current || uidRef.current !== uid) return;
      console.warn('Grow load failed', e);
      if (readCache(uid)) { setReady(true); setSync(navigator.onLine ? 'error' : 'offline'); ls.set(dirtyKey(uid), '1'); }
      else setLoadError(navigator.onLine ? 'We couldn’t load your data from the server.' : 'You’re offline. Connect to the internet to load your data.');
    }
  }, [commit]);

  /* React to sign-in / sign-out. */
  useEffect(() => {
    const sb = supabase();
    if (!sb) { setAuth('out'); return; }
    const onSession = (u: User | null) => {
      const uid = u?.id ?? null;
      setUser(u);
      if (uid === uidRef.current) { setAuth(uid ? 'in' : 'out'); return; }  // token refresh, profile update
      uidRef.current = uid;
      chain.current = Promise.resolve();
      warned.current = false;
      if (!uid) { commit(makeEmpty()); setReady(false); setLoadError(null); setSheet(null); setAuth('out'); return; }
      const cached = readCache(uid);
      commit(cached ?? makeEmpty());
      setReady(!!cached);
      setAuth('in');
      void load(uid);
    };
    // Supabase advises not to await other auth calls inside this callback, so defer the work.
    const { data } = sb.auth.onAuthStateChange((_event, session) => { setTimeout(() => onSession(session?.user ?? null), 0); });
    return () => data.subscription.unsubscribe();
  }, [commit, load]);

  /* Retry unsynced changes when the connection returns, and every 30 s while dirty. */
  useEffect(() => {
    const on = () => flushDirty();
    window.addEventListener('online', on);
    const t = setInterval(on, 30000);
    return () => { window.removeEventListener('online', on); clearInterval(t); };
  }, [flushDirty]);

  const update = useCallback((fn: (s: State) => State) => {
    const prev = Sref.current, next = fn(prev);
    if (next === prev) return;
    commit(next);
    const sb = supabase(); if (!sb) return;
    if (uidRef.current && ls.get(dirtyKey(uidRef.current))) flushDirty();
    else enqueue(uid => pushDiff(sb, uid, prev, next));
  }, [commit, enqueue, flushDirty]);
  const replace = useCallback((s: State) => update(() => s), [update]);

  const retryLoad = useCallback(() => { if (uidRef.current) void load(uidRef.current); }, [load]);

  const signOut = useCallback(async () => {
    const sb = supabase(); const uid = uidRef.current;
    if (!sb) return;
    await chain.current;                               // let pending saves finish
    if (uid) { ls.del(cacheKey(uid)); ls.del(dirtyKey(uid)); }
    await sb.auth.signOut();
  }, []);

  const openSheet = useCallback((s: SheetSpec) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    document.body.classList.toggle('noscroll', !!sheet);
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const value = useMemo(() => ({ S, auth, user, ready, loadError, sync, update, replace, retryLoad, signOut, toast, sheet, openSheet, closeSheet }),
    [S, auth, user, ready, loadError, sync, update, replace, retryLoad, signOut, toast, sheet, openSheet, closeSheet]);
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
