import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  🐟  The Tuna Ledger running at http://localhost:${PORT}\n`);
});
