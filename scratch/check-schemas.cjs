const { Pool } = require('pg');
require('dotenv').config({path: '.env.local'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'arena_admins'");
  console.log('arena_admins:', r.rows);
  const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'super_admins'");
  console.log('super_admins:', r2.rows);
  pool.end();
}
check();
