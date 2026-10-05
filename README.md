# Ghost Game Zone

Mobile-first FIFA session tracking for a 3-TV gaming center (V1).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** (production) or **local SQLite** in `/data` when Supabase env vars are missing

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same Wi‑Fi) or use dev tools mobile view.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/20260404120000_init.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended for server actions)

4. Restart `npm run dev`. The header badge switches from **Local DB** to **Supabase**.

## Floor workflow

1. **Start session** on an available TV.
2. Tap **+ Match** for each finished game (15 ETB by default).
3. **Extra time +5** updates the *current* match to 20 ETB (once per match).
4. **Undo last** removes the latest match if needed.
5. **Finish session** → payment method → TV becomes available; session appears in **History** and **Today**.

## Settings

Configure normal FIFA price, extra-time add-on, and console names under **Settings** (defaults: 15 / 5 / TV 1–3).

## Auth (planned)

`/login` is a placeholder for Supabase Auth (owner/manager). The floor dashboard runs without login in V1.
