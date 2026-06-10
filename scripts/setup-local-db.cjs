#!/usr/bin/env node

/**
 * Local PostgreSQL Setup Script
 * This script sets up PostgreSQL locally for development
 * Requirements: PostgreSQL must be installed and running
 */

const { exec } = require('child_process');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/futsal_laravel?schema=public';

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${command}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function waitForDb(retries = 30, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.end();
      console.log('✓ Database connection successful');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for database... (${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

async function runSqlFiles(client, dir) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠ SQL directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`📄 Applying SQL file: ${file}`);
    try {
      await client.query(sql);
    } catch (error) {
      console.error(`✗ Error applying ${file}:`, error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('\n🚀 Starting local PostgreSQL setup...\n');

  try {
    // Step 1: Ensure database is running
    console.log('📡 Checking PostgreSQL connection...');
    const ready = await waitForDb();
    
    if (!ready) {
      console.error('\n✗ Database did not become ready in time');
      console.error('Please ensure PostgreSQL is running on localhost:5432');
      process.exit(1);
    }

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
      // Step 2: Run SQL files
      console.log('\n📋 Running SQL schema and seed files...');
      const seedDir = path.join(process.cwd(), 'docker', 'postgres-init');
      await runSqlFiles(client, seedDir);

      // Step 3: Run Prisma migrations (optional, skip if schema already exists)
      console.log('\n📚 Running Prisma migrations...');
      try {
        await executeCommand('npx prisma migrate deploy');
      } catch (err) {
        if (err.message.includes('P3005') || err.message.includes('schema is not empty')) {
          console.log('⚠️  Prisma schema already applied (P3005), skipping migrations');
        } else {
          throw err;
        }
      }

      console.log('\n✅ Database setup complete!\n');
      console.log('📝 You can now:');
      console.log('   1. Start the dev server: npm run dev');
      console.log('   2. Login to admin: http://localhost:3000/admin/login');
      console.log('   3. Test with demo credentials (check seed data)\n');

    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
