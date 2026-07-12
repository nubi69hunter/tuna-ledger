import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function required(name, value) {
  if (!value) {
    throw new Error(
      `Missing ${name} env var. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY. ` +
      'See supabase/schema.sql for the schema to run in your project first.'
    );
  }
  return value;
}

// Service-role client: bypasses RLS. Only used for verifying user JWTs and
// seeding shared reference data (can_types) — never for per-user cans/meals.
// Built lazily so a missing env var fails the request that needs it, not
// every request — this app runs as a single serverless function, so a
// module-load-time crash here would take down static pages too.
let _admin = null;
export function getAdmin() {
  if (!_admin) {
    _admin = createClient(required('SUPABASE_URL', supabaseUrl), required('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceKey));
  }
  return _admin;
}

// One client per request, authenticated as the calling user, so Postgres RLS
// (auth.uid() = user_id) does the actual per-user data isolation.
export function createUserClient(accessToken) {
  required('SUPABASE_URL', supabaseUrl);
  required('SUPABASE_ANON_KEY', supabaseAnonKey);
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}

export { supabaseUrl, supabaseAnonKey };

const DEFAULT_TYPES = [
  { name: 'Water', color: '#3fa9d6', sort: 1 },
  { name: 'Olive oil', color: '#6bbf59', sort: 2 },
  { name: 'Sunflower oil', color: '#e6b325', sort: 3 },
  { name: 'Brine', color: '#2bb3a3', sort: 4 },
];

// Seeds default can_types on first use, not at module load. Memoized so it
// only runs once per warm function instance; failures are logged and
// retried on the next call rather than crashing the request.
let seeded = false;
export async function ensureDefaultTypes() {
  if (seeded) return;
  try {
    const admin = getAdmin();
    const { count } = await admin.from('can_types').select('*', { count: 'exact', head: true });
    if (!count) await admin.from('can_types').insert(DEFAULT_TYPES);
    seeded = true;
  } catch (err) {
    console.error('Failed to seed default can_types:', err.message);
  }
}
