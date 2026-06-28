require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function resetPassword() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const hash = bcrypt.hashSync('SuperAdmin@123', 10);
  await client.query('UPDATE super_admins SET password_hash = $1 WHERE email = $2', [hash, 'superadmin@example.com']);
  
  console.log('Password reset successfully!');
  await client.end();
}

resetPassword().catch(console.error);
