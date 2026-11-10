'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { makeSeed } from '@/lib/data';
import { useGrow } from '@/lib/store';
import { Icon } from '../ui';

function Pix({ kind }: { kind: 'plus' | 'stairs' | 'blocks' }) {
  const P = {
    plus: [[1, 0, '#1fc98a'], [0, 1, '#8ee3bf'], [1, 1, '#1fc98a'], [2, 1, '#8ee3bf'], [1, 2, '#1fc98a']],
    stairs: [[2, 0, '#e8830c'], [1, 1, '#f2b985'], [2, 1, '#f2b985'], [0, 2, '#e8830c'], [1, 2, '#e8830c'], [2, 2, '#f2b985']],
    blocks: [[0, 0, '#f7e08a'], [1, 0, '#f2bd10'], [2, 0, '#f2bd10'], [2, 1, '#f7e08a'], [0, 2, '#f2bd10'], [2, 2, '#f2bd10']],
  }[kind] as [number, number, string][];
  return <svg viewBox="0 0 3 3" width="34" height="34" aria-hidden="true" shapeRendering="crispEdges">{P.map(([x, y, c], i) => <rect key={i} x={x} y={y} width="1" height="1" fill={c} />)}</svg>;
}

function Onb({ children }: { children: React.ReactNode }) {
  useEffect(() => { document.body.classList.add('onb'); return () => document.body.classList.remove('onb'); }, []);
  return <><div id="bg" aria-hidden="true" /><div className="onb-page"><div className="onb-wrap">{children}</div></div></>;
}

export function Welcome() {
  const { S, ready } = useGrow();
  return (
    <Onb>
      <div className="deco" aria-hidden="true"><i className="dia d1" /><i className="dia d2" /><i className="dia d3" /></div>
      <div>
        <div className="brandrow"><span className="logo big"><Icon name="chart" /></span>Grow</div>
        <h1 className="hero-h">We help you achieve <em>Financial Freedom</em></h1>
        <p className="hero-p">Track every taka you earn and spend, watch your whole portfolio in one place, and get clear answers to your money questions.</p>
      </div>
      <div className="feat"><div><Pix kind="plus" /><b>Manage money</b></div><div><Pix kind="stairs" /><b>Invest smarter</b></div><div><Pix kind="blocks" /><b>Track everything</b></div></div>
      <div className="aicard"><span className="ti"><Icon name="ai" /></span>All in one place, with Ask Grow, your personal money guide</div>
      <div>
        {ready && S.entered
          ? <Link className="btn dark full" href="/">Back to my dashboard</Link>
          : <Link className="btn dark full" href="/login">Get started</Link>}
        <p className="note center" style={{ marginTop: 12 }}>Free to use. No account needed for now.</p>
      </div>
    </Onb>
  );
}

export function Login() {
  const { update, replace, S } = useGrow();
  const router = useRouter();
  const go = () => { update(s => ({ ...s, entered: true })); router.push('/'); };
  const demo = () => { replace({ ...makeSeed(), hide: S.hide }); router.push('/'); };
  return (
    <Onb>
      <div><Link className="iconbtn" href="/welcome" aria-label="Back"><Icon name="back" /></Link></div>
      <div><span className="logo big"><Icon name="chart" /></span><h1 className="hero-h sm">Welcome to Grow</h1><p className="hero-p">Accounts will let you sync your money across devices. They are coming soon.</p></div>
      <section className="card">
        <div className="banner" style={{ marginBottom: 10 }}><span><b>Login is not open yet.</b> For now Grow works in this browser without an account.</span></div>
        <form className="dis" aria-disabled="true" onSubmit={e => e.preventDefault()}>
          <div className="f"><label htmlFor="lg-e">Email</label><input id="lg-e" type="email" placeholder="you@example.com" disabled /></div>
          <div className="f"><label htmlFor="lg-p">Password</label><input id="lg-p" type="password" placeholder="••••••••" disabled /></div>
        </form>
        <button className="btn ghost full" style={{ marginTop: 12 }} disabled>Log in <span className="soon">Soon</span></button>
        <div className="or">or</div>
        <div className="grid2"><button className="btn ghost" disabled>Google <span className="soon">Soon</span></button><button className="btn ghost" disabled>Apple <span className="soon">Soon</span></button></div>
      </section>
      <div>
        <button className="btn dark full" onClick={go}>Continue without login</button>
        <button className="btn ghost full" style={{ marginTop: 10 }} onClick={demo}>Explore with example data</button>
        <p className="note center" style={{ marginTop: 12 }}>Your entries stay in this browser. You can sign in later once accounts open.</p>
      </div>
    </Onb>
  );
}
