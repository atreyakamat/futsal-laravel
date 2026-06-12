import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { confirmEntryByTicket, getBookingByTicket } from '@/lib/domain';
import { getAdminContext, userHasSecurityPermission } from '@/lib/admin';

const bodySchema = z.object({
  ticket_number: z.string().min(1),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const actorId = await readAuthUserId();
  const admin = await getAdminContext(actorId);

  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  if (admin.role === 'security') {
    const allowed = await userHasSecurityPermission(admin.id, 'canConfirmEntry');
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Security access denied for entry confirmation.' }, { status: 403 });
    }

    const booking = await getBookingByTicket(payload.ticket_number);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Ticket not found.' }, { status: 404 });
    }
    if (admin.arenaId && booking.arena_id !== admin.arenaId) {
      return NextResponse.json({ success: false, message: 'This ticket belongs to a different arena.' }, { status: 403 });
    }
  }

  const result = await confirmEntryByTicket(payload.ticket_number, actorId);

  if (!isJson) {
    return NextResponse.redirect(new URL(`/fg-admin/security/scan?ticket_number=${encodeURIComponent(payload.ticket_number)}&result=${result.success ? 'success' : 'error'}`, request.url));
  }

  return NextResponse.json(result, result.success ? { status: 200 } : { status: 400 });
}