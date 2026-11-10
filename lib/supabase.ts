'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

/* Browser-only Supabase client. Returns null when env vars are missing so the app still runs in guest mode. */
export function supabase(): SupabaseClient | null {
  if (typeof window === 'undefined' || !url || !key) return null;
  client ??= createClient(url, key, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export const authConfigured = () => !!(url && key);

/* Turns Supabase auth errors into plain sentences. */
export function authMessage(e: unknown): string {
  const m = (e as { message?: string })?.message || String(e);
  if (/invalid login credentials/i.test(m)) return 'That email and password don’t match. Try again or reset your password.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/already registered|already exists/i.test(m)) return 'An account with this email already exists. Try logging in instead.';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'Google sign-in isn’t switched on yet. Use email and password for now.';
  if (/not authorized|address not authorized/i.test(m)) return 'Email sign-up isn’t open for this address yet. Please use “Continue with Google” for now.';
  if (/error sending|sending (confirmation|recovery)/i.test(m)) return 'We couldn’t send the email right now. Please try again in a few minutes.';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/password.*(short|least|characters)/i.test(m)) return 'Use a password with at least 8 characters.';
  if (/weak|pwned|compromised/i.test(m)) return 'That password is too easy to guess. Please choose a stronger one.';
  if (/network|fetch/i.test(m)) return 'Can’t reach the server. Check your connection and try again.';
  return m;
}
