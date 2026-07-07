# 🐟 The Tuna Ledger

A full-stack website for tracking your tuna can collection, drained weight, and price-per-protein value.

## Run it

```bash
npm install
npm start
```

Then open **http://localhost:3000**

Requires **Node.js 22.5+** (uses the built-in `node:sqlite` — no native compilation, only Express is installed).

## What's inside

**Pages**
- **Dashboard** — stats + recent meals
- **Log a Meal** — pick a can from your collection, dial in grams from your scale, enter price
- **Collection** — every can you've catalogued, with type labels and per-can stats
- **The Board** — brand rankings (cheapest protein, cheapest tuna, most grams, best drain ratio, most eaten)
- **Can detail** — one can's full meal history

**Features**
- Pick-the-can flow (no retyping brands) with inline "add new can"
- Grams input via draggable dial + fine steppers (±1/±5/±10)
- Colored type labels: Water, Olive oil, Sunflower oil, Brine (add your own via `POST /api/types`)
- Drain ratio (drained ÷ labeled weight), price/100g, price per gram of protein

## Data model (SQLite)

- `can_types` — label name + color
- `cans` — your reusable catalog (brand, product, type, label weight, protein/100g, notes)
- `meals` — each logged meal referencing a can (drained grams, price, note, date)

Database lives at `data/tuna.db`.

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

## Swapping the database later

All SQL lives in `server/db.js` and `server/routes.js`. To move to Postgres, replace the `node:sqlite` calls with your driver of choice — the queries are plain SQL.
