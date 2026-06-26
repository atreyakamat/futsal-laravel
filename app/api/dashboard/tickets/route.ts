import { NextResponse } from 'next/server';
import { getBookingsForUser } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { generateQrDataUrl } from '@/lib/qr';

export async function GET() {
  const userId = await readAuthUserId();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const bookings = await getBookingsForUser(userId);
  const confirmedBookings = bookings.filter((b) => b.payment_status === 'confirmed');

  const tickets = await Promise.all(
    confirmedBookings.map(async (b) => ({
      ticket_number: b.ticket_number,
      booking_ref: b.booking_ref,
      arena_id: b.arena_id,
      booking_date: b.booking_date,
      time_slot: b.time_slot,
      amount: Number(b.amount),
      qr_url: b.ticket_number ? await generateQrDataUrl(b.ticket_number) : null,
    }))
  );

  return NextResponse.json({ success: true, tickets });
}
