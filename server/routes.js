import { Router } from 'express';
import db from './db.js';
import { per100g, proteinGrams, perProtein, drainRatio, DEFAULT_PROTEIN } from './metrics.js';

const router = Router();

/* ---------------- TYPES ---------------- */
router.get('/types', (req, res) => {
  res.json(db.prepare('SELECT * FROM can_types ORDER BY sort, name').all());
});

router.post('/types', (req, res) => {
  const { name, color } = req.body;
  if (!name || !color) return res.status(400).json({ error: 'name and color required' });
  try {
    const info = db.prepare('INSERT INTO can_types (name, color, sort) VALUES (?,?,?)')
      .run(name.trim(), color, 99);
    res.status(201).json(db.prepare('SELECT * FROM can_types WHERE id=?').get(Number(info.lastInsertRowid)));
  } catch (e) {
    res.status(409).json({ error: 'type already exists' });
  }
});

/* ---------------- CANS (the collection) ---------------- */
// Each can comes back enriched with its type and aggregated meal stats.
function canWithStats(row) {
  const meals = db.prepare('SELECT * FROM meals WHERE can_id=?').all(row.id);
  const n = meals.length;
  const gTot = meals.reduce((s, m) => s + m.drained, 0);
  const priceTot = meals.reduce((s, m) => s + m.price, 0);
  const per100Tot = meals.reduce((s, m) => s + per100g(m.price, m.drained), 0);
  const perProtTot = meals.reduce((s, m) => s + perProtein(m.price, m.drained, row.protein_per_100), 0);
  const protGTot = meals.reduce((s, m) => s + proteinGrams(m.drained, row.protein_per_100), 0);
  const ratio = drainRatio(gTot / (n || 1), row.label_weight);
  return {
    ...row,
    type: row.type_id ? db.prepare('SELECT * FROM can_types WHERE id=?').get(row.type_id) : null,
    times_eaten: n,
    avg_grams: n ? gTot / n : null,
    total_spent: priceTot,
    avg_per100: n ? per100Tot / n : null,
    avg_per_protein: n ? perProtTot / n : null,
    avg_protein_g: n ? protGTot / n : null,
    drain_ratio: ratio,
  };
}

router.get('/cans', (req, res) => {
  const rows = db.prepare('SELECT * FROM cans ORDER BY brand, product').all();
  res.json(rows.map(canWithStats));
});

router.get('/cans/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM cans WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const can = canWithStats(row);
  can.meals = db.prepare('SELECT * FROM meals WHERE can_id=? ORDER BY eaten_at DESC').all(row.id);
  res.json(can);
});

router.post('/cans', (req, res) => {
  const { brand, product, type_id, label_weight, default_price, protein_per_100, notes } = req.body;
  if (!brand || !brand.trim()) return res.status(400).json({ error: 'brand required' });
  const info = db.prepare(`INSERT INTO cans
    (brand, product, type_id, label_weight, default_price, protein_per_100, notes, created_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    brand.trim(), product?.trim() || null, type_id || null,
    label_weight || null, default_price || null, protein_per_100 || null,
    notes?.trim() || null, Date.now()
  );
  res.status(201).json(canWithStats(db.prepare('SELECT * FROM cans WHERE id=?').get(Number(info.lastInsertRowid))));
});

router.put('/cans/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cans WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { brand, product, type_id, label_weight, default_price, protein_per_100, notes } = req.body;
  db.prepare(`UPDATE cans SET brand=?, product=?, type_id=?, label_weight=?,
    default_price=?, protein_per_100=?, notes=? WHERE id=?`).run(
    brand?.trim() || existing.brand, product?.trim() ?? existing.product,
    type_id ?? existing.type_id, label_weight ?? existing.label_weight,
    default_price ?? existing.default_price, protein_per_100 ?? existing.protein_per_100,
    notes?.trim() ?? existing.notes, req.params.id
  );
  res.json(canWithStats(db.prepare('SELECT * FROM cans WHERE id=?').get(req.params.id)));
});

router.delete('/cans/:id', (req, res) => {
  db.prepare('DELETE FROM cans WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- MEALS (the log) ---------------- */
function mealEnriched(m) {
  const can = db.prepare('SELECT * FROM cans WHERE id=?').get(m.can_id);
  const type = can?.type_id ? db.prepare('SELECT * FROM can_types WHERE id=?').get(can.type_id) : null;
  return {
    ...m,
    brand: can?.brand, product: can?.product, type,
    label_weight: can?.label_weight, protein_per_100: can?.protein_per_100,
    per100: per100g(m.price, m.drained),
    per_protein: perProtein(m.price, m.drained, can?.protein_per_100),
    protein_g: proteinGrams(m.drained, can?.protein_per_100),
    drain_ratio: drainRatio(m.drained, can?.label_weight),
  };
}

router.get('/meals', (req, res) => {
  const rows = db.prepare('SELECT * FROM meals ORDER BY eaten_at DESC').all();
  res.json(rows.map(mealEnriched));
});

router.post('/meals', (req, res) => {
  const { can_id, drained, price, note, eaten_at } = req.body;
  if (!can_id || !drained || price == null)
    return res.status(400).json({ error: 'can_id, drained, price required' });
  const can = db.prepare('SELECT id FROM cans WHERE id=?').get(can_id);
  if (!can) return res.status(400).json({ error: 'unknown can' });
  const info = db.prepare(`INSERT INTO meals (can_id, drained, price, note, eaten_at)
    VALUES (?,?,?,?,?)`).run(can_id, drained, price, note?.trim() || null, eaten_at || Date.now());
  res.status(201).json(mealEnriched(db.prepare('SELECT * FROM meals WHERE id=?').get(Number(info.lastInsertRowid))));
});

router.delete('/meals/:id', (req, res) => {
  db.prepare('DELETE FROM meals WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- RANKINGS ---------------- */
const BOARDS = {
  protein: { val: c => c.avg_per_protein, asc: true },
  gram:    { val: c => c.avg_per100,      asc: true },
  grams:   { val: c => c.avg_grams,       asc: false },
  drain:   { val: c => c.drain_ratio,     asc: false },
  most:    { val: c => c.times_eaten,     asc: false },
};

router.get('/rankings/:board', (req, res) => {
  const cfg = BOARDS[req.params.board];
  if (!cfg) return res.status(404).json({ error: 'unknown board' });
  let cans = db.prepare('SELECT * FROM cans').all().map(canWithStats)
    .filter(c => c.times_eaten > 0 && cfg.val(c) != null && !isNaN(cfg.val(c)));
  cans.sort((a, b) => cfg.asc ? cfg.val(a) - cfg.val(b) : cfg.val(b) - cfg.val(a));
  res.json(cans);
});

/* ---------------- STATS ---------------- */
router.get('/stats', (req, res) => {
  const meals = db.prepare('SELECT * FROM meals').all();
  const cans = db.prepare('SELECT * FROM cans').all().map(canWithStats);
  const totalCans = cans.length;
  const totalMeals = meals.length;
  const totalSpent = meals.reduce((s, m) => s + m.price, 0);
  const totalGrams = meals.reduce((s, m) => s + m.drained, 0);
  const eaten = cans.filter(c => c.times_eaten > 0);
  const best = eaten.slice().sort((a, b) => a.avg_per_protein - b.avg_per_protein)[0] || null;
  res.json({
    total_cans: totalCans,
    total_meals: totalMeals,
    total_spent: totalSpent,
    total_grams: totalGrams,
    avg_grams: totalMeals ? totalGrams / totalMeals : null,
    best_value: best ? { brand: best.brand, product: best.product, per_protein: best.avg_per_protein } : null,
  });
});

export default router;
