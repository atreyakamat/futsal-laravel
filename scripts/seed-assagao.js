import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/futsal_laravel?schema=public';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database to seed AIEM Assagao');

  // Insert Arena
  const arenaResult = await client.query(
    `INSERT INTO arenas (name, slug, address, description, status, bot_enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW())
     ON CONFLICT (slug) 
     DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, description = EXCLUDED.description
     RETURNING id`,
    ['AIEM Assagao', 'aiem-assagao', 'Agnel Technical Educational Complex Assagao, Bardez – Goa 403507', 'AIEM Assagao Premium Futsal Turf', 'active']
  );

  const arenaId = arenaResult.rows[0]?.id;
  if (!arenaId) {
    console.error('Failed to upsert arena');
    await client.end();
    return;
  }
  console.log(`Arena AIEM Assagao created/updated with ID: ${arenaId}`);

  // Time slots and prices list (18:00 starts evening rate of 1416)
  const slots = [
    { slot: '06:00-07:00', price: 1003, start: '06:00', end: '07:00' },
    { slot: '07:00-08:00', price: 1003, start: '07:00', end: '08:00' },
    { slot: '08:00-09:00', price: 1003, start: '08:00', end: '09:00' },
    { slot: '09:00-10:00', price: 1003, start: '09:00', end: '10:00' },
    { slot: '10:00-11:00', price: 1003, start: '10:00', end: '11:00' },
    { slot: '11:00-12:00', price: 1003, start: '11:00', end: '12:00' },
    { slot: '12:00-13:00', price: 1003, start: '12:00', end: '13:00' },
    { slot: '13:00-14:00', price: 1003, start: '13:00', end: '14:00' },
    { slot: '14:00-15:00', price: 1003, start: '14:00', end: '15:00' },
    { slot: '15:00-16:00', price: 1003, start: '15:00', end: '16:00' },
    { slot: '16:00-17:00', price: 1003, start: '16:00', end: '17:00' },
    { slot: '17:00-18:00', price: 1003, start: '17:00', end: '18:00' },
    { slot: '18:00-19:00', price: 1416, start: '18:00', end: '19:00' },
    { slot: '19:00-20:00', price: 1416, start: '19:00', end: '20:00' },
    { slot: '20:00-21:00', price: 1416, start: '20:00', end: '21:00' },
    { slot: '21:00-22:00', price: 1416, start: '21:00', end: '22:00' },
    { slot: '22:00-23:00', price: 1416, start: '22:00', end: '23:00' },
    { slot: '23:00-00:00', price: 1416, start: '23:00', end: '00:00' }
  ];

  // Insert/Update Pricings
  for (const s of slots) {
    await client.query(
      `INSERT INTO pricings (arena_id, time_slot, price, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (arena_id, time_slot)
       DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
      [arenaId, s.slot, s.price]
    );
  }
  console.log('Pricing entries seeded successfully');

  // Insert/Update Slot Timings (Day of week: null represents all days, we will insert them as base timings)
  for (const s of slots) {
    await client.query(
      `INSERT INTO slot_timings (arena_id, time_slot, start_time, end_time, day_of_week, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NULL, NOW(), NOW())
       ON CONFLICT (arena_id, time_slot, day_of_week)
       DO NOTHING`,
      [arenaId, s.slot, s.start, s.end]
    );
  }
  console.log('Slot timings seeded successfully');

  await client.end();
  console.log('Seed process finished');
}

seed().catch((err) => {
  console.error('Error during seed:', err);
  process.exit(1);
});
