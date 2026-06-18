const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('Connecting to database for seeding...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Seed demo arena and basic settings
    console.log('Applying 002-seed.sql schema entries...');
    const seedFile = path.join(process.cwd(), 'docker', 'postgres-init', '002-seed.sql');
    if (fs.existsSync(seedFile)) {
      const sql = fs.readFileSync(seedFile, 'utf8');
      await client.query(sql);
      console.log('✓ Applied 002-seed.sql');
    } else {
      console.warn('⚠ 002-seed.sql not found');
    }

    // 2. Create super admin user in 'users' table
    console.log('Creating super admin user in users table...');
    const adminEmail = 'superadmin@example.com';
    const adminMobile = '+919999999999';
    // Password hash for "SuperAdmin@123"
    const superAdminPasswordHash = '$2a$10$bbjpX2oHSkNinCzPo.P58OY1On33K7SBrU3ekzUb8piwH4JU68Rri';

    await client.query(
      `INSERT INTO users (name, email, customer_mobile, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         role = EXCLUDED.role,
         updated_at = NOW()`,
      ['Super Admin', adminEmail, adminMobile, superAdminPasswordHash, 'super_admin']
    );
    console.log('✓ Super Admin created in users table');

    // 3. Create entry in 'super_admins' table linked to 'users' table
    const { rows: superAdminUserRows } = await client.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [adminEmail]
    );

    if (superAdminUserRows.length > 0) {
      const superAdminUserId = superAdminUserRows[0].id;
      await client.query(
        `INSERT INTO super_admins (user_id, email, password_hash, first_name, last_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           password_hash = EXCLUDED.password_hash,
           updated_at = NOW()`,
        [superAdminUserId, adminEmail, superAdminPasswordHash, 'Super', 'Admin']
      );
      console.log('✓ Linked Super Admin to super_admins table');
    }

    // 4. Seed demo bookings for Pilar Arena
    const { rows: arenaRows } = await client.query(
      "SELECT id FROM arenas WHERE slug = 'pilar-arena' LIMIT 1"
    );

    if (arenaRows.length > 0) {
      const arenaId = arenaRows[0].id;
      const today = new Date();
      const bookingOneDate = new Date(today);
      bookingOneDate.setDate(bookingOneDate.getDate() + 1);
      const bookingTwoDate = new Date(today);
      bookingTwoDate.setDate(bookingTwoDate.getDate() + 2);

      const demoUserEmail = 'player@example.com';
      const { rows: demoUserRows } = await client.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [demoUserEmail]
      );
      
      const demoUserId = demoUserRows.length ? demoUserRows[0].id : null;

      if (demoUserId) {
        await client.query(
          `INSERT INTO bookings (
             ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
             customer_name, customer_mobile, customer_email, amount, payment_status,
             payment_method, notes, checked_in, is_free_booking, created_at, updated_at
           )
           VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, FALSE, NOW(), NOW()),
           ($14, $15, $3, $4, $16, $17, $18, $19, $20, $21, $22, $23, $24, FALSE, FALSE, NOW(), NOW())
           ON CONFLICT (ticket_number) DO NOTHING`,
          [
            'AF-0001',
            'AF-BOOK-0001',
            arenaId,
            demoUserId,
            bookingOneDate.toISOString().slice(0, 10),
            '18:00-19:00',
            'League Night',
            '+10000000001',
            'bookings@anglefutsal.test',
            5000.00,
            'confirmed',
            'online',
            'Seeded demo booking for Pilar Arena',
            'AF-0002',
            'AF-BOOK-0002',
            bookingTwoDate.toISOString().slice(0, 10),
            '19:00-20:00',
            'Corporate Match',
            '+10000000002',
            'corporate@anglefutsal.test',
            6500.00,
            'pending',
            'online',
            'Second seeded booking for Pilar Arena'
          ]
        );
        console.log('✓ Seeded demo bookings successfully');
      } else {
        console.warn('⚠ Demo customer user not found, skipping bookings seed');
      }
    }

    console.log('\n🔥 SEEDING COMPLETE! 🔥\n');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
