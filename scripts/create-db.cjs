const { Client } = require('pg');

async function main() {
  const connectionStrings = [
    'postgresql://postgres:postgres@localhost:5432/postgres',
    'postgresql://postgres:postgres@localhost:5434/postgres',
    'postgresql://postgres@localhost:5432/postgres',
    'postgresql://postgres@localhost:5434/postgres'
  ];

  let client;
  let connected = false;

  for (const connectionString of connectionStrings) {
    console.log(`Trying connection: ${connectionString}`);
    client = new Client({ connectionString });
    try {
      await client.connect();
      console.log('Connected successfully!');
      connected = true;
      break;
    } catch (err) {
      console.error(`Connection failed for ${connectionString}: ${err.message}`);
    }
  }

  if (!connected) {
    console.error('Failed to connect to PostgreSQL with all attempts.');
    process.exit(1);
  }

  try {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'futsal_laravel'");
    if (res.rowCount === 0) {
      console.log("Creating database 'futsal_laravel'...");
      await client.query('CREATE DATABASE futsal_laravel');
      console.log("Database 'futsal_laravel' created successfully.");
    } else {
      console.log("Database 'futsal_laravel' already exists.");
    }
  } catch (err) {
    console.error('Error during database check/creation:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
