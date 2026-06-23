import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmEntryByTicket, getBookingByTicket } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, userHasSecurityPermission, createAdminAuditLog } from '@/lib/admin';

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
      const allowed = await userHasSecurityPermission(admin.id, 'canConfirmEntry');
      if (!allowed) {
        return NextResponse.json({ success: false, message: 'Security access denied for entry confirmation.' }, { status: 403 });
      }
    }

    const booking = await getBookingByTicket(payload.ticket_number);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Ticket not found.' }, { status: 404 });
    }

    if (admin.role === 'security' && admin.arenaId && booking.arena_id !== admin.arenaId) {
      return NextResponse.json({ success: false, message: 'This ticket belongs to a different arena.' }, { status: 403 });
    }

    const result = await confirmEntryByTicket(payload.ticket_number, userId);

    if (result.success) {
      await createAdminAuditLog({
        action: 'CHECKIN_CONFIRMED',
        requestedBy: userId,
        arenaId: booking.arena_id,
        newValue: { ticket_number: payload.ticket_number },
      });
    }

    return NextResponse.json(result, result.success ? { status: 200 } : { status: 400 });
  } catch (error) {
    console.error('Check-in error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
