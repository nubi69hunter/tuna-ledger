import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) env vars. ' +
    'See supabase/schema.sql for the schema to run in your project first.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_TYPES = [
  { name: 'Water', color: '#3fa9d6', sort: 1 },
  { name: 'Olive oil', color: '#6bbf59', sort: 2 },
  { name: 'Sunflower oil', color: '#e6b325', sort: 3 },
  { name: 'Brine', color: '#2bb3a3', sort: 4 },
];

const { count } = await supabase.from('can_types').select('*', { count: 'exact', head: true });
if (!count) {
  await supabase.from('can_types').insert(DEFAULT_TYPES);
}

export default supabase;
