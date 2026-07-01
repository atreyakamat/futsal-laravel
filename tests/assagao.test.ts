import { describe, it, expect, beforeAll } from 'vitest';
import { queryOne } from '@/lib/db';
import { GET } from '@/app/api/slots/status/route';
import { NextRequest } from 'next/server';

describe('AIEM Assagao Weekday Student Slot Reservation', () => {
  let assagaoId: number;

  beforeAll(async () => {
    // Retrieve the seeded AIEM Assagao arena ID
    const arena = await queryOne<{ id: number }>('SELECT id FROM arenas WHERE slug = ?', ['aiem-assagao']);
    if (arena) {
      assagaoId = arena.id;
    } else {
      throw new Error('AIEM Assagao was not seeded properly');
    }
  });

  it('should block 15:00-16:00 and 16:00-17:00 slots on a weekday (Wednesday, 2026-07-01)', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/slots/status?arena_id=${assagaoId}&date=2026-07-01`
    );

    const res = await GET(request);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    const targetSlots = data.slots.filter(
      (s: any) => s.time_slot === '15:00-16:00' || s.time_slot === '16:00-17:00'
    );

    expect(targetSlots).toHaveLength(2);
    for (const slot of targetSlots) {
      expect(slot.status).toBe('booked');
    }
  });

  it('should not block 15:00-16:00 and 16:00-17:00 slots on a weekend (Saturday, 2026-07-04)', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/slots/status?arena_id=${assagaoId}&date=2026-07-04`
    );

    const res = await GET(request);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    const targetSlots = data.slots.filter(
      (s: any) => s.time_slot === '15:00-16:00' || s.time_slot === '16:00-17:00'
    );

    expect(targetSlots).toHaveLength(2);
    for (const slot of targetSlots) {
      // Unless they are actually booked by a user, they should be available or selected
      expect(slot.status).not.toBe('booked');
    }
  });
});
