import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/futsal_laravel', 
  max: 2 
});

async function main() {
  const c = await pool.connect();
  
  try {
    const cols = await c.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'slot_timings' ORDER BY ordinal_position"
    );
    console.log('slot_timings cols:', cols.rows.map((r: any) => r.column_name + ':' + r.data_type).join(', '));
    
    const timings = await c.query('SELECT * FROM slot_timings WHERE arena_id = 23 LIMIT 5');
    console.log('timings for arena 23 (AIEM Assagao):', JSON.stringify(timings.rows, null, 2));
    
    const pricings = await c.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pricings' ORDER BY ordinal_position"
    );
    console.log('pricings cols:', pricings.rows.map((r: any) => r.column_name + ':' + r.data_type).join(', '));
    
    const priceRows = await c.query('SELECT * FROM pricings WHERE arena_id = 23 LIMIT 3');
    console.log('pricings for arena 23:', JSON.stringify(priceRows.rows));
    
  } finally {
    c.release(); 
    await pool.end();
  }
}

main().catch((e: any) => { console.error('ERR:', e.message); process.exit(1); });
