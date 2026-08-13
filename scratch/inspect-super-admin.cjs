const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: true });

async function inspect() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='super_admins';");
    console.log("super_admins columns:", res.rows.map(r => r.column_name));
    
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users';");
    console.log("users columns:", res2.rows.map(r => r.column_name));
  } finally {
    await pool.end();
  }
}

inspect().catch(console.error);
