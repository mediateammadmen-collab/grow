'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { displayName, useGrow } from '@/lib/store';
import { Avatar, Icon, SYNC_LABEL, type IconName } from './ui';
import { SheetHost } from './sheets';

const NAV: [string, string, IconName][] = [['/', 'Home', 'home'], ['/daily', 'Daily', 'daily'], ['/ask', 'Ask Grow', 'ai'], ['/history', 'History', 'history']];
export function Shell({ children }: { children: ReactNode }) {
  const { auth, user, ready, loadError, retryLoad, sync, openSheet, toast } = useGrow();
  const path = usePathname(), router = useRouter();

  useEffect(() => { if (auth === 'out') router.replace('/welcome'); }, [auth, router]);
  useEffect(() => {
    if (auth !== 'in') return;
    const q = new URLSearchParams(location.search);
    if (q.get('pw') === 'updated') { toast('Password updated'); router.replace(path); }
  }, [auth, path, router, toast]);

  if (auth !== 'in') return <div className="boot" aria-busy="true" />;
  if (!ready) return (
    <div className="boot center">
      {loadError
        ? <div className="card" style={{ maxWidth: 380, margin: '0 auto' }}><h3>Can’t load your data</h3><p className="note" style={{ margin: '8px 0 14px' }}>{loadError}</p><button className="btn full" onClick={retryLoad}>Try again</button></div>
        : <><span className="orb" style={{ margin: '0 auto 14px' }}><Icon name="ai" /></span><p className="muted">Loading your money…</p></>}
    </div>
  );

  const name = displayName(user);
  const avatar = (user?.user_metadata as Record<string, string> | undefined)?.avatar_url;
  const active = (h: string) => h === '/' ? path === '/' : path.startsWith(h);
  return (
    <div className="shell">
      <aside className="side" aria-label="Main">
        <div className="brand"><span className="logo"><Icon name="chart" /></span><b>Grow</b></div>
        <nav>
          {NAV.map(([h, l, i]) => <Link key={h} href={h} aria-current={active(h) ? 'page' : undefined}><Icon name={i} />{l}</Link>)}
        </nav>
        <button className="btn full" onClick={() => openSheet({ kind: 'tx' })}><Icon name="plus" /> Add entry</button>
        <button className="side-user" onClick={() => openSheet({ kind: 'settings' })} aria-label="Settings">
          <Avatar name={name} url={avatar} />
          <span className="mid"><b>{name}</b><span className={'syncdot ' + sync}>{SYNC_LABEL[sync]}</span></span>
          <Icon name="gear" />
        </button>
      </aside>
      <main id="view">{children}</main>
      {(path.startsWith('/daily') || path.startsWith('/history')) && <button className="fab" onClick={() => openSheet({ kind: 'tx' })} aria-label="Add entry"><Icon name="plus" /></button>}
      <nav id="nav" aria-label="Main">
        {NAV.map(([h, l, i]) => <Link key={h} href={h} aria-current={active(h) ? 'page' : undefined}><Icon name={i} />{l}</Link>)}
      </nav>
      <SheetHost />
    </div>
  );
}
