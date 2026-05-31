import { NextResponse } from 'next/server';
import { getBookingByTicket } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, userHasSecurityPermission } from '@/lib/admin';

export async function GET(_: Request, context: { params: Promise<{ ticket_number: string }> }) {
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

  const { ticket_number } = await context.params;
  const booking = await getBookingByTicket(ticket_number);

  if (!booking) {
    return NextResponse.json({ success: false, message: 'Invalid ticket number.' }, { status: 404 });
  }

  if (admin.role === 'security' && admin.arenaId && booking.arena_id !== admin.arenaId) {
    return NextResponse.json({ success: false, message: 'This ticket belongs to a different arena.' }, { status: 403 });
  }

  return NextResponse.json({ success: true, booking });
}