import { describe, it, expect } from 'vitest';
import { queryOne } from '@/lib/domain';

/**
 * `bookings_active_slot_idx` is the only real safeguard against two
 * concurrent requests double-booking the same slot. It's a partial unique
 * index that Prisma's schema DSL cannot express (see the comment on the
 * Booking model in prisma/schema.prisma), so it lives purely in a raw SQL
 * migration and is invisible to `prisma migrate dev`'s schema diffing. This
 * test is the safety net: if any future migration ever drops it, this fails
 * loudly instead of silently reintroducing double-booking.
 */
describe('bookings_active_slot_idx', () => {
  it('exists in the database with the expected partial-unique definition', async () => {
    const row = await queryOne<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'bookings_active_slot_idx'`
    );

    expect(row).not.toBeNull();
    expect(row!.indexdef).toContain('UNIQUE');
    expect(row!.indexdef).toContain('arena_id');
    expect(row!.indexdef).toContain('booking_date');
    expect(row!.indexdef).toContain('time_slot');
    expect(row!.indexdef).toMatch(/WHERE.*payment_status/i);
  });
});
