# 🐟 The Tuna Ledger

A full-stack website for tracking your tuna can collection, drained weight, and price-per-protein value.

## Run it

1. Create a Supabase project and run `supabase/schema.sql` against it (SQL editor, or `supabase db push`). If you're upgrading an existing tuna-ledger database that still has the old per-user schema, run `supabase/remove_auth_migration.sql` once instead (drops the `user_id` columns and RLS, keeps your data).
2. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your project's API settings.
3. Install and start:

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
- No login — single-user app, the server talks to Supabase with the service-role key
- Pick-the-can flow (no retyping brands) with inline "add new can"
- Grams input via draggable dial + fine steppers (±1/±5/±10)
- Colored type labels: Water, Olive oil, Sunflower oil, Brine (shared across accounts; add your own via `POST /api/types`)
- Drain ratio (drained ÷ labeled weight), price/100g, price per gram of protein

## Data model (Supabase Postgres)

- `can_types` — label name + color; shared reference data
- `cans` — your reusable catalog (brand, product, type, label weight, protein/100g, notes)
- `meals` — each logged meal referencing a can (drained grams, price, note, date)

Schema lives in `supabase/schema.sql`. No RLS — the server talks to Postgres with the service-role key.

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

`server/db.js` exposes a single service-role admin client, used for every request. `server/routes.js` uses `req.supabase` — the query builder, no raw SQL.
