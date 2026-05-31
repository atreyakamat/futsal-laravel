import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/futsal_laravel?schema=public';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminMobile = process.env.ADMIN_MOBILE || '+919999999999';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  console.log(`Seeding admin user: ${adminEmail}`);

  await client.query(
    `INSERT INTO users (name, email, customer_mobile, password, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       role = EXCLUDED.role,
       updated_at = NOW()`,
    ['Admin', adminEmail, adminMobile, adminPasswordHash, 'super_admin']
  );

  console.log('Seed complete');
  await client.end();
}

seed().catch(console.error);
