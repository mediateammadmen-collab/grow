'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useGrow } from '@/lib/store';
import { Icon, type IconName } from './ui';
import { SheetHost } from './sheets';

const NAV: [string, string, IconName][] = [['/', 'Home', 'home'], ['/daily', 'Daily', 'daily'], ['/ask', 'Ask Grow', 'ai'], ['/history', 'History', 'history']];

export function Shell({ children }: { children: ReactNode }) {
  const { S, ready, openSheet } = useGrow();
  const path = usePathname(), router = useRouter();
  useEffect(() => { if (ready && !S.entered) router.replace('/welcome'); }, [ready, S.entered, router]);
  if (!ready || !S.entered) return <div className="boot" aria-busy="true" />;
  const active = (h: string) => h === '/' ? path === '/' : path.startsWith(h);
  return (
    <div className="shell">
      <aside className="side" aria-label="Main">
        <div className="brand"><span className="logo"><Icon name="chart" /></span><b>Grow</b></div>
        <nav>
          {NAV.map(([h, l, i]) => <Link key={h} href={h} aria-current={active(h) ? 'page' : undefined}><Icon name={i} />{l}</Link>)}
        </nav>
        <button className="btn full" onClick={() => openSheet({ kind: 'tx' })}><Icon name="plus" /> Add entry</button>
        <button className="side-set" onClick={() => openSheet({ kind: 'settings' })}><Icon name="gear" /> Settings</button>
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
