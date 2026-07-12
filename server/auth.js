import { getAdmin, createUserClient, ensureDefaultTypes } from './db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const { data, error } = await getAdmin().auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'unauthorized' });
    req.user = data.user;
    req.supabase = createUserClient(token);
    await ensureDefaultTypes();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
