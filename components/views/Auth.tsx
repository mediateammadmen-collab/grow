'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { authMessage, supabase } from '@/lib/supabase';
import { useGrow } from '@/lib/store';
import { Icon } from '../ui';

/* ---------- shared bits ---------- */
const origin = () => window.location.origin;
const callbackUrl = (next?: string) => origin() + '/auth/callback' + (next ? '?next=' + encodeURIComponent(next) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Pix({ kind }: { kind: 'plus' | 'stairs' | 'blocks' }) {
  const P = {
    plus: [[1, 0, '#1fc98a'], [0, 1, '#8ee3bf'], [1, 1, '#1fc98a'], [2, 1, '#8ee3bf'], [1, 2, '#1fc98a']],
    stairs: [[2, 0, '#e8830c'], [1, 1, '#f2b985'], [2, 1, '#f2b985'], [0, 2, '#e8830c'], [1, 2, '#e8830c'], [2, 2, '#f2b985']],
    blocks: [[0, 0, '#f7e08a'], [1, 0, '#f2bd10'], [2, 0, '#f2bd10'], [2, 1, '#f7e08a'], [0, 2, '#f2bd10'], [2, 2, '#f2bd10']],
  }[kind] as [number, number, string][];
  return <svg viewBox="0 0 3 3" width="34" height="34" aria-hidden="true" shapeRendering="crispEdges">{P.map(([x, y, c], i) => <rect key={i} x={x} y={y} width="1" height="1" fill={c} />)}</svg>;
}

function Onb({ children }: { children: ReactNode }) {
  useEffect(() => { document.body.classList.add('onb'); return () => document.body.classList.remove('onb'); }, []);
  return <><div id="bg" aria-hidden="true" /><div className="onb-page"><div className="onb-wrap">{children}</div></div></>;
}

/* Send signed-in visitors to the app (used on welcome, login, signup, forgot). */
function useBounceIfSignedIn() {
  const { auth } = useGrow(); const router = useRouter();
  useEffect(() => { if (auth === 'in') router.replace('/'); }, [auth, router]);
  return auth;
}

function Head({ title, sub, back = '/welcome' }: { title: string; sub?: ReactNode; back?: string }) {
  return <>
    <div><Link className="iconbtn" href={back} aria-label="Back"><Icon name="back" /></Link></div>
    <div><span className="logo big"><Icon name="chart" /></span><h1 className="hero-h sm">{title}</h1>{sub && <p className="hero-p">{sub}</p>}</div>
  </>;
}

function Field({ id, label, ...p }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="af" htmlFor={id}><span>{label}</span><input id={id} {...p} /></label>;
}
function PasswordField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return <label className="af" htmlFor={id}><span>{label}</span>
    <span className="pw"><input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} required minLength={8} maxLength={72} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eyeoff' : 'eye'} /></button></span>
  </label>;
}

function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const go = async () => {
    const sb = supabase(); if (!sb) return setErr('Sign-in is not configured.');
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl(), queryParams: { prompt: 'select_account' } } });
    if (error) { setErr(authMessage(error)); setBusy(false); }
  };
  return <>
    <button type="button" className="btn ghost full gbtn" onClick={go} disabled={busy}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" /></svg>
      {busy ? 'Opening Google…' : label}
    </button>
    {err && <p className="err" role="alert">{err}</p>}
  </>;
}

/* ---------- Welcome ---------- */
export function Welcome() {
  const auth = useBounceIfSignedIn();
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
      <div className="stack" style={{ gap: 10 }}>
        <Link className="btn dark full" href="/signup" aria-disabled={auth === 'loading'}>Create a free account</Link>
        <Link className="btn ghost full" href="/login">I already have an account</Link>
        <p className="note center" style={{ marginTop: 4 }}>Your data is private to your account and syncs across your devices.</p>
      </div>
    </Onb>
  );
}

/* ---------- Log in ---------- */
export function Login() {
  useBounceIfSignedIn();
  const router = useRouter();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [unconfirmed, setUnconfirmed] = useState(false);
  const [info, setInfo] = useState('');
  useEffect(() => { const e = new URLSearchParams(location.search).get('email'); if (e) setEmail(e); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setInfo(''); setUnconfirmed(false);
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email address.');
    if (!pw) return setErr('Enter your password.');
    const sb = supabase(); if (!sb) return setErr('Sign-in is not configured.');
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) { setErr(authMessage(error)); setUnconfirmed(/not confirmed/i.test(error.message)); return; }
    router.replace('/');
  };
  const resend = async () => {
    const sb = supabase(); if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: callbackUrl() } });
    setBusy(false);
    if (error) setErr(authMessage(error)); else { setErr(''); setUnconfirmed(false); setInfo('We sent a new confirmation link. Check your inbox and spam folder.'); }
  };

  return (
    <Onb>
      <Head title="Welcome back" sub="Log in to see your money." />
      <section className="card stack" style={{ gap: 14 }}>
        <GoogleButton label="Continue with Google" />
        <div className="or" style={{ margin: 0 }}>or with email</div>
        <form className="stack" style={{ gap: 12 }} onSubmit={submit} noValidate>
          <Field id="li-email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <PasswordField id="li-pw" label="Password" value={pw} onChange={setPw} autoComplete="current-password" />
          <div className="af-row"><Link className="link" href={'/forgot-password' + (email ? '?email=' + encodeURIComponent(email.trim()) : '')}>Forgot password?</Link></div>
          {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
          {unconfirmed && <button type="button" className="btn ghost full" onClick={resend} disabled={busy}>Resend confirmation email</button>}
          {info && <p className="okmsg" role="status">{info}</p>}
          <button className="btn full" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
      </section>
      <p className="note center">New to Grow? <Link className="link" href="/signup">Create an account</Link></p>
    </Onb>
  );
}

/* ---------- Sign up ---------- */
export function Signup() {
  useBounceIfSignedIn();
  const router = useRouter();
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null); const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    const em = email.trim();
    if (!name.trim()) return setErr('Enter your name.');
    if (!EMAIL_RE.test(em)) return setErr('Enter a valid email address.');
    if (pw.length < 8) return setErr('Use a password with at least 8 characters.');
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setErr('Use at least one letter and one number in your password.');
    if (pw !== pw2) return setErr('The two passwords don’t match.');
    const sb = supabase(); if (!sb) return setErr('Sign-up is not configured.');
    setBusy(true);
    const { data, error } = await sb.auth.signUp({ email: em, password: pw, options: { data: { full_name: name.trim().slice(0, 100) }, emailRedirectTo: callbackUrl() } });
    setBusy(false);
    if (error) return setErr(authMessage(error));
    if (data.user && data.user.identities && data.user.identities.length === 0) return setErr('An account with this email already exists. Log in instead, or use “Forgot password”.');
    if (data.session) { router.replace('/'); return; }   // email confirmation turned off
    setSentTo(em);
  };
  const resend = async () => {
    const sb = supabase(); if (!sb || !sentTo) return;
    setBusy(true);
    const { error } = await sb.auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: callbackUrl() } });
    setBusy(false);
    setInfo(error ? authMessage(error) : 'Sent again. It can take a minute to arrive.');
  };

  if (sentTo) return (
    <Onb>
      <Head title="Check your inbox" back="/signup" sub={<>We sent a confirmation link to <b>{sentTo}</b>. Open it on this device to finish creating your account.</>} />
      <section className="card stack" style={{ gap: 12 }}>
        <p className="note">Can’t find it? Check your spam or promotions folder. The link expires after 24 hours.</p>
        <button className="btn ghost full" onClick={resend} disabled={busy}>{busy ? 'Sending…' : 'Resend the email'}</button>
        {info && <p className="okmsg" role="status">{info}</p>}
      </section>
      <Link className="btn dark full" href={'/login?email=' + encodeURIComponent(sentTo)}>I’ve confirmed, log me in</Link>
    </Onb>
  );

  return (
    <Onb>
      <Head title="Create your account" sub="Free, private, and synced across your devices." />
      <section className="card stack" style={{ gap: 14 }}>
        <GoogleButton label="Sign up with Google" />
        <div className="or" style={{ margin: 0 }}>or with email</div>
        <form className="stack" style={{ gap: 12 }} onSubmit={submit} noValidate>
          <Field id="su-name" label="Your name" type="text" autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} required />
          <Field id="su-email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <PasswordField id="su-pw" label="Password (8+ characters, a letter and a number)" value={pw} onChange={setPw} autoComplete="new-password" />
          <PasswordField id="su-pw2" label="Confirm password" value={pw2} onChange={setPw2} autoComplete="new-password" />
          {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
          <button className="btn full" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="note center">By creating an account you agree to our <a className="link" href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>.</p>
        </form>
      </section>
      <p className="note center">Already have an account? <Link className="link" href="/login">Log in</Link></p>
    </Onb>
  );
}

/* ---------- Forgot password ---------- */
export function Forgot() {
  useBounceIfSignedIn();
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  useEffect(() => { const e = new URLSearchParams(location.search).get('email'); if (e) setEmail(e); }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email address.');
    const sb = supabase(); if (!sb) return setErr('Not configured.');
    setBusy(true);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl('/reset-password') });
    setBusy(false);
    if (error) return setErr(authMessage(error));
    setSent(true);
  };
  return (
    <Onb>
      <Head title="Reset your password" back="/login" sub={sent ? <>If an account exists for <b>{email.trim()}</b>, we sent a link to set a new password. Open it on this device.</> : 'Enter your email and we’ll send you a link to set a new password.'} />
      {!sent ? <section className="card">
        <form className="stack" style={{ gap: 12 }} onSubmit={submit} noValidate>
          <Field id="fp-email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
          {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
          <button className="btn full" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      </section> : <section className="card stack" style={{ gap: 10 }}>
        <p className="note">Didn’t get it? Check spam, or wait a minute and try again. Signed up with Google? Just use “Continue with Google”.</p>
        <button className="btn ghost full" onClick={() => setSent(false)}>Try again</button>
      </section>}
      <p className="note center"><Link className="link" href="/login">Back to log in</Link></p>
    </Onb>
  );
}

/* ---------- Set a new password (after the email link) ---------- */
export function ResetPassword() {
  const { auth } = useGrow(); const router = useRouter();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Use a password with at least 8 characters.');
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setErr('Use at least one letter and one number in your password.');
    if (pw !== pw2) return setErr('The two passwords don’t match.');
    const sb = supabase(); if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(/different from the old/i.test(error.message) ? 'Choose a password you haven’t used before.' : authMessage(error));
    router.replace('/?pw=updated');
  };
  if (auth === 'loading') return <Onb><p className="note center">Loading…</p></Onb>;
  if (auth === 'out') return (
    <Onb>
      <Head title="Link expired" back="/login" sub="This password reset link is no longer valid. Request a new one and open it on this device." />
      <Link className="btn dark full" href="/forgot-password">Send a new link</Link>
    </Onb>
  );
  return (
    <Onb>
      <Head title="Set a new password" back="/" sub="Choose a new password for your Grow account." />
      <section className="card">
        <form className="stack" style={{ gap: 12 }} onSubmit={submit} noValidate>
          <PasswordField id="rp-pw" label="New password (8+ characters, a letter and a number)" value={pw} onChange={setPw} autoComplete="new-password" />
          <PasswordField id="rp-pw2" label="Confirm new password" value={pw2} onChange={setPw2} autoComplete="new-password" />
          {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
          <button className="btn full" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      </section>
    </Onb>
  );
}

/* ---------- /auth/callback: finishes Google sign-in, email confirmation and password reset ---------- */
const handled = new Set<string>();   // React dev mode runs effects twice; exchange each code once
export function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.slice(1));
    const rawNext = q.get('next') || '/';
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
    const code = q.get('code');
    const errDesc = q.get('error_description') || h.get('error_description');
    const sb = supabase();
    if (!sb) { setErr('Sign-in is not configured.'); return; }
    if (errDesc) {
      setErr(/expired|invalid/i.test(errDesc) ? 'This link has expired or was already used. Request a new one.' : errDesc.replace(/\+/g, ' '));
      return;
    }
    if (!code) { router.replace('/'); return; }
    if (handled.has(code)) return;
    handled.add(code);
    (async () => {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (!error) { router.replace(next); return; }
      const { data } = await sb.auth.getSession();
      if (data.session) { router.replace(next); return; }
      setErr('We couldn’t finish signing you in with this link. This happens when it’s opened in a different browser or app than the one you started in. If you were confirming your email, it’s confirmed. Just log in.');
    })();
  }, [router]);
  return (
    <Onb>
      {err ? <>
        <Head title="Almost there" back="/login" sub={err} />
        <div className="stack" style={{ gap: 10 }}>
          <Link className="btn dark full" href="/login">Go to log in</Link>
          <Link className="btn ghost full" href="/forgot-password">Reset password</Link>
        </div>
      </> : <div className="center" style={{ margin: 'auto' }}><span className="orb" style={{ margin: '0 auto 14px' }}><Icon name="ai" /></span><p className="muted">Signing you in…</p></div>}
    </Onb>
  );
}
