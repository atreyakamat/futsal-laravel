#!/usr/bin/env node
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/futsal_laravel?schema=public';
const CORRECT_HASH = '$2a$10$bbjpX2oHSkNinCzPo.P58OY1On33K7SBrU3ekzUb8piwH4JU68Rri';

async function updateSuperAdmin() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    
    // Update super admin with correct password hash
    const res = await client.query(
      'UPDATE super_admins SET password_hash = $1, is_active = true, updated_at = NOW() WHERE email = $2',
      [CORRECT_HASH, 'superadmin@example.com']
    );
    
    if (res.rowCount === 0) {
      // If not exists, then insert
      await client.query(
        'INSERT INTO super_admins (email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        ['superadmin@example.com', CORRECT_HASH, 'Super', 'Admin', true]
      );
      console.log('✓ Super admin user created');
    } else {
      console.log('✓ Super admin user updated with correct password');
    }
    console.log('  Email: superadmin@example.com');
    console.log('  Password: SuperAdmin@123');
    
  } finally {
    await client.end();
  }
}

updateSuperAdmin().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
