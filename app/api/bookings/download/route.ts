import { NextRequest, NextResponse } from 'next/server';
import { getBookingByTicket, getBookingsByRef, getArenaById } from '@/lib/domain';
import { generateTicketPdfBuffer } from '@/lib/pdf';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketNumber = searchParams.get('ticket');
    const bookingRef = searchParams.get('ref');

    if (!ticketNumber && !bookingRef) {
      return NextResponse.json(
        { success: false, message: 'Either ticket or ref query parameter is required.' },
        { status: 400 }
      );
    }

    let booking: any = null;

    if (ticketNumber) {
      booking = await getBookingByTicket(ticketNumber);
    } else if (bookingRef) {
      const bookings = await getBookingsByRef(bookingRef);
      if (bookings && bookings.length > 0) {
        booking = bookings[0];
      }
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking/ticket not found.' },
        { status: 404 }
      );
    }

    // Retrieve arena info for the ticket
    const arena = await getArenaById(booking.arena_id);
    const arenaName = arena?.name || 'Futsal Arena';
    const arenaAddress = arena?.address || 'Assagao, Goa';

    const pdfBuffer = await generateTicketPdfBuffer(booking, arenaName, arenaAddress);

    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${booking.ticket_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[API PDF] Download error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
