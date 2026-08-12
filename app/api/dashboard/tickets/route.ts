import { NextResponse } from 'next/server';
import { getGroupedBookingsForUser } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { generateQrDataUrl } from '@/lib/qr';

export async function GET() {
  const userId = await readAuthUserId();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const groupedBookings = await getGroupedBookingsForUser(userId);
  const confirmedBookings = groupedBookings.filter((b) => b.payment_status === 'confirmed');

  const tickets = await Promise.all(
    confirmedBookings.map(async (b) => ({
      ticket_number: b.primary_ticket_number,
      booking_ref: b.booking_ref,
      arena_id: b.arena_id,
      booking_date: b.booking_date,
      slots: b.slots.map((s) => s.time_slot),
      total_amount: b.total_amount,
      qr_url: b.primary_ticket_number ? await generateQrDataUrl(b.primary_ticket_number) : null,
    }))
  );

  return NextResponse.json({ success: true, data: tickets });
}
