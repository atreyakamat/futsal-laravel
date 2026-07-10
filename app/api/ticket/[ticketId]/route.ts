import { NextRequest, NextResponse } from 'next/server';
import { getBookingByTicket, getArenaById } from '@/lib/domain';
import { generateTicketPdfBuffer } from '@/lib/pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Extract ticket number by removing the .pdf extension if present
    const ticketNumber = resolvedParams.ticketId.replace(/\.pdf$/, '');

    if (!ticketNumber) {
      return NextResponse.json(
        { success: false, message: 'Ticket parameter is required.' },
        { status: 400 }
      );
    }

    const b = await getBookingByTicket(ticketNumber);
    if (!b) {
      return NextResponse.json(
        { success: false, message: 'Booking/ticket not found.' },
        { status: 404 }
      );
    }

    // Retrieve arena info for the ticket
    const arena = await getArenaById(b.arena_id);
    const arenaName = arena?.name || 'Futsal Arena';
    const arenaAddress = arena?.address || 'Assagao, Goa';

    const pdfBuffer = await generateTicketPdfBuffer([b], arenaName, arenaAddress);

    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${b.ticket_number}.pdf"`,
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
