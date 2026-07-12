import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase config: set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY env vars. ' +
    'See supabase/schema.sql for the schema to run in your project first.'
  );
}

// Service-role client: bypasses RLS. Only used for verifying user JWTs and
// seeding shared reference data (can_types) — never for per-user cans/meals.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// One client per request, authenticated as the calling user, so Postgres RLS
// (auth.uid() = user_id) does the actual per-user data isolation.
export function createUserClient(accessToken) {
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

const { count } = await supabaseAdmin.from('can_types').select('*', { count: 'exact', head: true });
if (!count) {
  await supabaseAdmin.from('can_types').insert(DEFAULT_TYPES);
}
