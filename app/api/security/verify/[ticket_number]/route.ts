import { NextResponse } from 'next/server';
import { getBookingByTicket } from '@/lib/domain';

export async function GET(_: Request, context: { params: Promise<{ ticket_number: string }> }) {
  const { ticket_number } = await context.params;
  const booking = await getBookingByTicket(ticket_number);

  if (!booking) {
    return NextResponse.json({ success: false, message: 'Invalid ticket number.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, booking });
}