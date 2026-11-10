# Grow (web)

Next.js 16 + React 19 + TypeScript rebuild of the Grow PWA. Data stays in the browser (`localStorage`, key `grow.web.v2`); there is no backend yet.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Layout
- `app/` – routes: `/` home, `/daily`, `/ask`, `/history`, `/welcome`, `/login`
- `components/views/` – one file per screen; `components/sheets.tsx` – add/edit forms, settings, calculators
- `lib/data.ts` – types, categories, example data, backup import (accepts old v1 backups)
- `lib/calc.ts` – money formatting and all derived numbers. **Money is stored as integer paisa.**
- `lib/store.tsx` – state, persistence, toasts, sheets
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
