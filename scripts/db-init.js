const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitForDb(retries = 30, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.end();
      return true;
    } catch (err) {
      console.log(`DB not ready, retrying (${i + 1}/${retries})...`);
      await sleep(delay);
    }
  }
  return false;
}

async function runSqlFiles(client, dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const p = path.join(dir, f);
    console.log('Applying SQL file:', p);
    const sql = fs.readFileSync(p, 'utf8');
    try {
      await client.query(sql);
      console.log('Applied', f);
    } catch (err) {
      console.error('Error applying', f, err.message || err);
      // continue on error to be resilient
    }
  }
}

async function main() {
  console.log('Waiting for database...');
  const ok = await waitForDb();
  if (!ok) {
    console.error('Database did not become ready in time');
    process.exit(1);
  }

  console.log('Running Prisma schema push...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } catch (err) {
    console.error('prisma db push failed:', err.message || err);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Apply bundled SQL seeds (idempotent)
  const seedDir = path.join(process.cwd(), 'docker', 'postgres-init');
  await runSqlFiles(client, seedDir);

  await client.end();
  console.log('DB init complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
