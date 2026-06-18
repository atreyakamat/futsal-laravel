const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in environment');
    process.exit(1);
  }

  console.log('Connecting to database to clean schema...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('Dropping public schema...');
    await client.query('DROP SCHEMA public CASCADE');
    console.log('Recreating public schema...');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('Database schema cleaned successfully!');
  } catch (error) {
    console.error('Error cleaning database schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
