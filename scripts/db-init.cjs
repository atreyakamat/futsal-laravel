const { Client } = require('pg');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDb(retries = 30, delay = 2000) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.end();
      return true;
    } catch (error) {
      console.log(`DB not ready, retrying (${attempt + 1}/${retries})...`);
      await sleep(delay);
    }
  }

  return false;
}

async function runSqlFiles(client, dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('Applying SQL file:', file);
    await client.query(sql);
  }
}

async function seedDemoData(client) {
  const { rows: arenaRows } = await client.query(
    'SELECT id FROM arenas ORDER BY created_at ASC LIMIT 1'
  );

  if (!arenaRows.length) {
    throw new Error('No arena found for demo seeding');
  }

  const arenaId = arenaRows[0].id;
  const { rows: userRows } = await client.query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    ['demo@example.com']
  );
  const demoUserId = userRows.length ? userRows[0].id : null;
  const demoPassword = await bcrypt.hash('AngleFutsal123!', 10);
  const today = new Date();
  const bookingOne = new Date(today);
  bookingOne.setDate(bookingOne.getDate() + 1);
  const bookingTwo = new Date(today);
  bookingTwo.setDate(bookingTwo.getDate() + 2);

  // Create initial admin user from environment variables or defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminMobile = process.env.ADMIN_MOBILE || '+919999999999';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  // Upsert initial admin user
  await client.query(
    `INSERT INTO users (email, customer_mobile, password, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       role = EXCLUDED.role,
       updated_at = NOW()`,
    [adminEmail, adminMobile, adminPasswordHash, 'super_admin']
  );

  console.log(`✓ Admin user created/updated: ${adminEmail}`);

  await client.query(
    `INSERT INTO bookings (
       ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
       customer_name, customer_mobile, customer_email, amount, payment_status,
       payment_method, notes, checked_in, checked_in_at, checked_in_by,
       is_free_booking, payu_mihpayid, created_at, updated_at
     )
     VALUES
     ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, NULL, NULL, FALSE, NULL, NOW(), NOW()),
     ($14, $15, $3, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, FALSE, NULL, NULL, FALSE, NULL, NOW(), NOW())
     ON CONFLICT (ticket_number) DO NOTHING`,
    [
      'AF-0001',
      'AF-BOOK-0001',
      arenaId,
      demoUserId,
      bookingOne.toISOString().slice(0, 10),
      '18:00-19:00',
      'League Night',
      '+10000000001',
      'bookings@anglefutsal.test',
      5000,
      'confirmed',
      'online',
      'Seeded demo booking for Angle Futsal',
      'AF-0002',
      'AF-BOOK-0002',
      demoUserId,
      bookingTwo.toISOString().slice(0, 10),
      '19:00-20:00',
      'Corporate Match',
      '+10000000002',
      'corporate@anglefutsal.test',
      6500,
      'pending',
      'online',
      'Second seeded booking for the demo dashboard',
    ]
  );
}

async function main() {
  console.log('Waiting for database...');
  const ready = await waitForDb();

  if (!ready) {
    console.error('Database did not become ready in time');
    process.exit(1);
  }

  console.log('Running Prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const seedDir = path.join(process.cwd(), 'docker', 'postgres-init');
    await runSqlFiles(client, seedDir);
    await seedDemoData(client);
  } finally {
    await client.end();
  }

  console.log('DB init complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
