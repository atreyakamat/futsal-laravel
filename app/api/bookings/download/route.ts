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

    let bookingsForPdf: any[] = [];

    if (ticketNumber) {
      const b = await getBookingByTicket(ticketNumber);
      if (b) bookingsForPdf = [b];
    } else if (bookingRef) {
      const b = await getBookingsByRef(bookingRef);
      if (b && b.length > 0) bookingsForPdf = b;
    }

    if (bookingsForPdf.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Booking/ticket not found.' },
        { status: 404 }
      );
    }

    // Retrieve arena info for the ticket
    const arena = await getArenaById(bookingsForPdf[0].arena_id);
    const arenaName = arena?.name || 'Futsal Arena';
    const arenaAddress = arena?.address || 'Assagao, Goa';

    const pdfBuffer = await generateTicketPdfBuffer(bookingsForPdf, arenaName, arenaAddress);

    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${bookingsForPdf[0].ticket_number}.pdf"`,
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
