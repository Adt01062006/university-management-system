// Uses PostgreSQL when DATABASE_URL is set, otherwise a built-in demo database (no install needed).
let pool;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  const { newDb } = require('pg-mem');
  const { Pool } = newDb().adapters.createPg();
  pool = new Pool();
  console.log('Demo mode: in-memory database (resets on restart). Set DATABASE_URL to use PostgreSQL.');
}
module.exports = { q: (text, params) => pool.query(text, params).then((r) => r.rows) };
