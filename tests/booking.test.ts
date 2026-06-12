import { describe, it, expect, beforeAll } from 'vitest';
import { query, queryOne } from '@/lib/db';
import { expirePendingBookings } from '@/lib/domain';

describe('Booking Lifecycle & Cleanup', () => {
  let testArenaId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Get an existing active arena or create a dummy one
    const arena = await queryOne<{ id: number }>('SELECT id FROM arenas LIMIT 1');
    if (arena) {
      testArenaId = arena.id;
    } else {
      const newArena = await queryOne<{ id: number }>(
        "INSERT INTO arenas (name, slug, status, created_at, updated_at) VALUES ('Test Booking Turf', 'test-booking-turf', 'active', NOW(), NOW()) RETURNING id"
      );
      testArenaId = newArena!.id;
    }

    // Get an existing user or create a dummy one
    const user = await queryOne<{ id: number }>('SELECT id FROM users LIMIT 1');
    if (user) {
      testUserId = user.id;
    } else {
      const newUser = await queryOne<{ id: number }>(
        "INSERT INTO users (name, email, role, created_at, updated_at) VALUES ('Test User', 'testuser@example.com', 'customer', NOW(), NOW()) RETURNING id"
      );
      testUserId = newUser!.id;
    }
  });

  it('should expire pending bookings older than 15 minutes', async () => {
    // 1. Insert a booking older than 15 minutes (e.g. 20 minutes ago)
    const oldTicket = 'TKT-OLD-' + Date.now();
    await query(
      `INSERT INTO bookings (ticket_number, booking_ref, user_id, arena_id, booking_date, time_slot, customer_name, customer_mobile, amount, payment_status, created_at, updated_at)
       VALUES (?, 'REF-OLD', ?, ?, '2026-06-12', '18:00-19:00', 'Old User', '1234567890', 500, 'pending', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes')`,
      [oldTicket, testUserId, testArenaId]
    );

    // 2. Insert a fresh pending booking (e.g. 2 minutes ago)
    const freshTicket = 'TKT-FRESH-' + Date.now();
    await query(
      `INSERT INTO bookings (ticket_number, booking_ref, user_id, arena_id, booking_date, time_slot, customer_name, customer_mobile, amount, payment_status, created_at, updated_at)
       VALUES (?, 'REF-FRESH', ?, ?, '2026-06-12', '19:00-20:00', 'Fresh User', '1234567890', 500, 'pending', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes')`,
      [freshTicket, testUserId, testArenaId]
    );

    // 3. Run cleanup
    await expirePendingBookings();

    // 4. Verify results
    const oldBooking = await queryOne<{ payment_status: string }>(
      'SELECT payment_status FROM bookings WHERE ticket_number = ?',
      [oldTicket]
    );
    const freshBooking = await queryOne<{ payment_status: string }>(
      'SELECT payment_status FROM bookings WHERE ticket_number = ?',
      [freshTicket]
    );

    expect(oldBooking?.payment_status).toBe('failed');
    expect(freshBooking?.payment_status).toBe('pending');

    // Clean up test records
    await query('DELETE FROM bookings WHERE ticket_number IN (?, ?)', [oldTicket, freshTicket]);
  });
});
