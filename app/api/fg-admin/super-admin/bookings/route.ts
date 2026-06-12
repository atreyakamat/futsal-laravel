import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBookingBatch, queryOne, getArenaPricing } from '@/lib/domain';
import { logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';

const createBookingSchema = z.object({
  arena_id: z.coerce.number(),
  date: z.string().min(1),
  time_slot: z.string().min(1),
  number_of_rounds: z.number().min(1).max(10).default(1),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = createBookingSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Verify arena exists
    const arena = await queryOne(
      'SELECT id, name FROM arenas WHERE id = ?',
      [payload.arena_id]
    );

    if (!arena) {
      return NextResponse.json(
        { success: false, message: 'Arena not found' },
        { status: 404 }
      );
    }

    // Handle multiple rounds by finding consecutive slots
    const allSlots = await getArenaPricing(payload.arena_id);
    const sortedSlots = allSlots.map(s => s.time_slot).sort();
    const startIndex = sortedSlots.indexOf(payload.time_slot);
    
    let slotsToBlock = [payload.time_slot];
    if (startIndex !== -1 && payload.number_of_rounds > 1) {
      slotsToBlock = sortedSlots.slice(startIndex, startIndex + payload.number_of_rounds);
    }

    // Create direct free booking (blocks slots website-wide immediately)
    const result = await createBookingBatch({
      arenaId: payload.arena_id,
      bookingDate: payload.date,
      slots: slotsToBlock,
      customerName: 'System Block (Super Admin)',
      customerMobile: '0000000000',
      customerEmail: 'system@futsalgoa.com',
      userId: null,
      sessionId: `super-admin-block-${Date.now()}`,
      freeBooking: true,
    });

    // Log audit action
    await logAuditAction(
      superAdminId,
      'DIRECT_SLOT_BLOCK',
      'booking',
      undefined,
      { arena_id: payload.arena_id, date: payload.date, slot: payload.time_slot, reason: payload.reason },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Slots blocked successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Direct block error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
