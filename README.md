# 🐟 The Tuna Ledger

A full-stack website for tracking your tuna can collection, drained weight, and price-per-protein value.

## Run it

1. Create a Supabase project and run `supabase/schema.sql` against it (SQL editor, or `supabase db push`).
2. Under Authentication > Providers, the Email provider is on by default. To enable "Continue with Google", turn on the Google provider and paste in a Client ID/Secret from a Google Cloud OAuth app (Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Copy `.env.example` to `.env` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your project's API settings.
4. Install and start:

```bash
npm install
npm start
```

Then open **http://localhost:3000**

Requires **Node.js 22.5+**.

## What's inside

**Pages**
- **Dashboard** — stats + recent meals
- **Log a Meal** — pick a can from your collection, dial in grams from your scale, enter price
- **Collection** — every can you've catalogued, with type labels and per-can stats
- **The Board** — brand rankings (cheapest protein, cheapest tuna, most grams, best drain ratio, most eaten)
- **Can detail** — one can's full meal history

**Features**
- Email/password sign-up and login, plus optional "Continue with Google" (Supabase Auth)
- Every can and meal is private to the account that created it
- Pick-the-can flow (no retyping brands) with inline "add new can"
- Grams input via draggable dial + fine steppers (±1/±5/±10)
- Colored type labels: Water, Olive oil, Sunflower oil, Brine (shared across accounts; add your own via `POST /api/types`)
- Drain ratio (drained ÷ labeled weight), price/100g, price per gram of protein

## Data model (Supabase Postgres)

- `can_types` — label name + color; shared reference data, readable/writable by any logged-in user
- `cans` — your reusable catalog (brand, product, type, label weight, protein/100g, notes), owned via `user_id`
- `meals` — each logged meal referencing a can (drained grams, price, note, date), owned via `user_id`

Schema lives in `supabase/schema.sql`. `cans` and `meals` carry a `user_id` column defaulting to `auth.uid()`, and Row Level Security policies restrict every operation on those tables to rows where `user_id = auth.uid()` — the server issues requests through a client authenticated as the calling user (not the service-role key), so RLS is the actual enforcement point, not just defense in depth.

## Auth

`server/auth.js` verifies the `Authorization: Bearer <token>` header on every `/api/*` request against Supabase Auth and attaches a per-request, user-scoped Supabase client (`req.supabase`) plus `req.user`. The frontend (`public/js/auth.js`) talks to Supabase Auth directly from the browser (via `/api/config`, which hands out the non-secret project URL + anon key) and sends the resulting access token on every API call (`public/js/common.js`). `/login` and `/signup` are the only pages reachable without a session; every other page redirects to `/login` if signed out.

## API

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/types` | list / add type labels |
| GET/POST | `/api/cans` | list / add cans |
| GET/PUT/DELETE | `/api/cans/:id` | one can (with meal history) |
| GET/POST | `/api/meals` | list / log meals |
| DELETE | `/api/meals/:id` | delete a meal |
| GET | `/api/rankings/:board` | `protein`\|`gram`\|`grams`\|`drain`\|`most` |
| GET | `/api/stats` | dashboard totals |

## Database access

`server/db.js` exposes a service-role admin client (used only to verify JWTs and seed default `can_types`) and a factory that builds a user-scoped client per request. `server/routes.js` uses `req.supabase` — the query builder, no raw SQL.
