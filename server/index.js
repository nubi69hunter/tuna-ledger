import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import routes from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', routes);
app.use(express.static(join(__dirname, '..', 'public')));

// Page routes (multi-page app)
const pages = ['index', 'log', 'collection', 'board', 'can'];
app.get('/', (req, res) => res.sendFile(join(__dirname, '..', 'public', 'pages', 'index.html')));
pages.forEach(p => {
  app.get('/' + p, (req, res) => res.sendFile(join(__dirname, '..', 'public', 'pages', p + '.html')));
});

app.listen(PORT, () => {
  console.log(`\n  🐟  The Tuna Ledger running at http://localhost:${PORT}\n`);
});
