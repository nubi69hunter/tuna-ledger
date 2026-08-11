import { Router } from 'express';
import { getAdmin, ensureDefaultTypes } from './db.js';
import { per100g, proteinGrams, perProtein, drainRatio, DEFAULT_PROTEIN } from './metrics.js';

const router = Router();

// Single-user app, no login: every request goes straight to Supabase via
// the service-role client.
router.use(async (req, res, next) => {
  req.supabase = getAdmin();
  await ensureDefaultTypes();
  next();
});

/* ---------------- TYPES ---------------- */
router.get('/types', async (req, res) => {
  const { data, error } = await req.supabase.from('can_types').select('*').order('sort').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/types', async (req, res) => {
  const { name, color } = req.body;
  if (!name || !color) return res.status(400).json({ error: 'name and color required' });
  const { data, error } = await req.supabase
    .from('can_types')
    .insert({ name: name.trim(), color, sort: 99 })
    .select()
    .single();
  if (error) return res.status(409).json({ error: 'type already exists' });
  res.status(201).json(data);
});

/* ---------------- CANS (the collection) ---------------- */
// Each can comes back enriched with its type and aggregated meal stats.
async function canWithStats(supabase, row) {
  const [{ data: meals }, type] = await Promise.all([
    supabase.from('meals').select('*').eq('can_id', row.id),
    row.type_id
      ? supabase.from('can_types').select('*').eq('id', row.type_id).maybeSingle().then(r => r.data)
      : Promise.resolve(null),
  ]);
  const mealList = meals || [];
  const n = mealList.length;
  const gTot = mealList.reduce((s, m) => s + m.drained, 0);
  const priceTot = mealList.reduce((s, m) => s + m.price, 0);
  const per100Tot = mealList.reduce((s, m) => s + per100g(m.price, m.drained), 0);
  const perProtTot = mealList.reduce((s, m) => s + perProtein(m.price, m.drained, row.protein_per_100), 0);
  const protGTot = mealList.reduce((s, m) => s + proteinGrams(m.drained, row.protein_per_100), 0);
  const ratio = drainRatio(gTot / (n || 1), row.label_weight);
  return {
    ...row,
    type,
    times_eaten: n,
    avg_grams: n ? gTot / n : null,
    total_spent: priceTot,
    avg_per100: n ? per100Tot / n : null,
    avg_per_protein: n ? perProtTot / n : null,
    avg_protein_g: n ? protGTot / n : null,
    drain_ratio: ratio,
  };
}

router.get('/cans', async (req, res) => {
  const { data, error } = await req.supabase.from('cans').select('*').order('brand').order('product');
  if (error) return res.status(500).json({ error: error.message });
  res.json(await Promise.all(data.map(row => canWithStats(req.supabase, row))));
});

router.get('/cans/:id', async (req, res) => {
  const { data: row, error } = await req.supabase.from('cans').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'not found' });
  const can = await canWithStats(req.supabase, row);
  const { data: meals } = await req.supabase
    .from('meals')
    .select('*')
    .eq('can_id', row.id)
    .order('eaten_at', { ascending: false });
  can.meals = meals || [];
  res.json(can);
});

router.post('/cans', async (req, res) => {
  const { brand, product, type_id, label_weight, default_price, protein_per_100, notes } = req.body;
  if (!brand || !brand.trim()) return res.status(400).json({ error: 'brand required' });
  const { data, error } = await req.supabase
    .from('cans')
    .insert({
      brand: brand.trim(),
      product: product?.trim() || null,
      type_id: type_id || null,
      label_weight: label_weight || null,
      default_price: default_price || null,
      protein_per_100: protein_per_100 || null,
      notes: notes?.trim() || null,
      created_at: Date.now(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(await canWithStats(req.supabase, data));
});

router.put('/cans/:id', async (req, res) => {
  const { data: existing, error: fetchError } = await req.supabase
    .from('cans')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { brand, product, type_id, label_weight, default_price, protein_per_100, notes } = req.body;
  const { data, error } = await req.supabase
    .from('cans')
    .update({
      brand: brand?.trim() || existing.brand,
      product: product?.trim() ?? existing.product,
      type_id: type_id ?? existing.type_id,
      label_weight: label_weight ?? existing.label_weight,
      default_price: default_price ?? existing.default_price,
      protein_per_100: protein_per_100 ?? existing.protein_per_100,
      notes: notes?.trim() ?? existing.notes,
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(await canWithStats(req.supabase, data));
});

router.delete('/cans/:id', async (req, res) => {
  const { error } = await req.supabase.from('cans').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/* ---------------- MEALS (the log) ---------------- */
async function mealEnriched(supabase, m) {
  const { data: can } = await supabase.from('cans').select('*').eq('id', m.can_id).maybeSingle();
  let type = null;
  if (can?.type_id) {
    const { data } = await supabase.from('can_types').select('*').eq('id', can.type_id).maybeSingle();
    type = data;
  }
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

router.get('/meals', async (req, res) => {
  const { data, error } = await req.supabase.from('meals').select('*').order('eaten_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(await Promise.all(data.map(m => mealEnriched(req.supabase, m))));
});

router.post('/meals', async (req, res) => {
  const { can_id, drained, price, note, eaten_at } = req.body;
  if (!can_id || !drained || price == null)
    return res.status(400).json({ error: 'can_id, drained, price required' });
  const { data: can } = await req.supabase.from('cans').select('id').eq('id', can_id).maybeSingle();
  if (!can) return res.status(400).json({ error: 'unknown can' });
  const { data, error } = await req.supabase
    .from('meals')
    .insert({
      can_id,
      drained,
      price,
      note: note?.trim() || null,
      eaten_at: eaten_at || Date.now(),
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(await mealEnriched(req.supabase, data));
});

router.delete('/meals/:id', async (req, res) => {
  const { error } = await req.supabase.from('meals').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
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

router.get('/rankings/:board', async (req, res) => {
  const cfg = BOARDS[req.params.board];
  if (!cfg) return res.status(404).json({ error: 'unknown board' });
  const { data, error } = await req.supabase.from('cans').select('*');
  if (error) return res.status(500).json({ error: error.message });
  let cans = (await Promise.all(data.map(row => canWithStats(req.supabase, row))))
    .filter(c => c.times_eaten > 0 && cfg.val(c) != null && !isNaN(cfg.val(c)));
  cans.sort((a, b) => cfg.asc ? cfg.val(a) - cfg.val(b) : cfg.val(b) - cfg.val(a));
  res.json(cans);
});

/* ---------------- STATS ---------------- */
router.get('/stats', async (req, res) => {
  const [{ data: meals, error: mealsError }, { data: cansRaw, error: cansError }] = await Promise.all([
    req.supabase.from('meals').select('*'),
    req.supabase.from('cans').select('*'),
  ]);
  if (mealsError) return res.status(500).json({ error: mealsError.message });
  if (cansError) return res.status(500).json({ error: cansError.message });
  const cans = await Promise.all(cansRaw.map(row => canWithStats(req.supabase, row)));
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
