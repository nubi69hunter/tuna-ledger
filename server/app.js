import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import routes from './routes.js';
import { supabaseUrl, supabaseAnonKey } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// Public: hands the frontend the (non-secret) URL + anon key it needs to
// talk to Supabase Auth directly. Must come before the /api router below,
// which requires a logged-in user.
app.get('/api/config', (req, res) => {
  res.json({ url: supabaseUrl, anonKey: supabaseAnonKey });
});

app.use('/api', routes);
app.use(express.static(join(__dirname, '..', 'public')));

// Page routes (multi-page app)
const pages = ['index', 'log', 'collection', 'board', 'can', 'login', 'signup'];
app.get('/', (req, res) => res.sendFile(join(__dirname, '..', 'public', 'pages', 'index.html')));
pages.forEach(p => {
  app.get('/' + p, (req, res) => res.sendFile(join(__dirname, '..', 'public', 'pages', p + '.html')));
});

export default app;
