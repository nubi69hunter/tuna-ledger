import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'tuna.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS can_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  sort INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS cans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  product TEXT,
  type_id INTEGER REFERENCES can_types(id),
  label_weight REAL,
  default_price REAL,
  protein_per_100 REAL,
  notes TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  can_id INTEGER NOT NULL REFERENCES cans(id) ON DELETE CASCADE,
  drained REAL NOT NULL,
  price REAL NOT NULL,
  note TEXT,
  eaten_at INTEGER NOT NULL
);
`);

const typeCount = db.prepare('SELECT COUNT(*) n FROM can_types').get().n;
if (typeCount === 0) {
  const insert = db.prepare('INSERT INTO can_types (name, color, sort) VALUES (?,?,?)');
  [['Water', '#3fa9d6', 1], ['Olive oil', '#6bbf59', 2],
   ['Sunflower oil', '#e6b325', 3], ['Brine', '#2bb3a3', 4]]
    .forEach(r => insert.run(...r));
}

export default db;
