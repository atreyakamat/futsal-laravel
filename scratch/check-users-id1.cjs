const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: true });

async function inspect() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT * FROM users WHERE id=1;');
    console.log("USER 1:", res.rows);
  } finally {
    await pool.end();
  }
}

inspect().catch(console.error);
