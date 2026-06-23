import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookingByTicket } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, userHasSecurityPermission } from '@/lib/admin';

const bodySchema = z.object({
  ticket_number: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const userId = await readAuthUserId();
    const admin = await getAdminContext(userId);

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (admin.role === 'security') {
      const allowed = await userHasSecurityPermission(admin.id, 'canVerifyTicket');
      if (!allowed) {
        return NextResponse.json({ success: false, message: 'Security access denied for ticket verification.' }, { status: 403 });
      }
    }

    const booking = await getBookingByTicket(payload.ticket_number);

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Invalid ticket number.' }, { status: 404 });
    }

    if (admin.role === 'security' && admin.arenaId && booking.arena_id !== admin.arenaId) {
      return NextResponse.json({ success: false, message: 'This ticket belongs to a different arena.' }, { status: 403 });
    }

    const isValid = booking.payment_status === 'confirmed';
    const alreadyCheckedIn = !!booking.checked_in;

    return NextResponse.json({
      success: true,
      valid: isValid && !alreadyCheckedIn,
      already_checked_in: alreadyCheckedIn,
      booking: {
        ticket_number: booking.ticket_number,
        booking_ref: booking.booking_ref,
        customer_name: booking.customer_name,
        booking_date: booking.booking_date,
        time_slot: booking.time_slot,
        arena_id: booking.arena_id,
        payment_status: booking.payment_status,
        checked_in: alreadyCheckedIn,
        is_free_booking: booking.is_free_booking,
      },
    });
  } catch (error) {
    console.error('Ticket verification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
