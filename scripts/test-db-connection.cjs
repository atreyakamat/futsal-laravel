const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres'; // Try 5432 again

async function checkConnection() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('Successfully connected to PostgreSQL!');
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
  }
}

checkConnection();
