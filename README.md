# Grow (web)

Next.js 16 + React 19 + TypeScript. Sign-in (email + password, Google) and data storage use **Supabase**.

## Setup
1. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key.
2. In Supabase → SQL Editor, run `supabase/migrations/0001_init.sql` once.
3. Supabase → Authentication → URL Configuration: Site URL `http://localhost:3000`, Redirect URL `http://localhost:3000/**` (add your real domain when deploying).
4. Google: OAuth client (Web) in Google Cloud with redirect URI `https://<project>.supabase.co/auth/v1/callback`; paste its ID and secret into Supabase → Sign In / Providers → Google.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Layout
- `app/` – app routes `/` `/daily` `/ask` `/history` (sign-in required); auth routes `/welcome` `/login` `/signup` `/forgot-password` `/reset-password` `/auth/callback`
- `components/views/` – one file per screen; `components/sheets.tsx` – add/edit forms, settings, calculators
- `lib/data.ts` – types and categories
- `lib/supabase.ts` – Supabase browser client and friendly auth error messages
- `lib/sync.ts` – maps app state ⇄ database rows; writes only changed rows; full reconcile after offline edits
- `lib/calc.ts` – money formatting and all derived numbers. **Money is stored as integer paisa.**
- `lib/store.tsx` – auth state, per-user cache, save queue with offline retry, toasts, sheets
- `supabase/migrations/` – database schema with row level security
- `lib/guide.ts` – Ask Grow's question & answer library (no AI calls)

## Adding a question to Ask Grow
Add an entry to the `E` array in `lib/guide.ts`:

```ts
{
  id: 'myq', topic: 'Saving', q: 'The question as shown on chips?',
  keys: ['single', 'words', 'or phrases score higher'],
  follow: ['save', 'budget'],           // ids suggested after the answer
  tool: 'loan',                          // optional: shows a button to open a calculator
  answer: (S, raw) => `Text with **bold**, _muted italics_, "- " bullets and ${money(123400)}`,
}
```
