import { NextRequest, NextResponse } from 'next/server';
import { getBookingByTicket } from '@/lib/domain';
import { verifyTicketDownloadToken } from '@/lib/ticket-token';
import { buildTicketVerificationUrl, generateQrPngBuffer } from '@/lib/qr';

// Hosted QR image for the ticket, as real PNG bytes rather than a
// data:-URI, so it renders in email clients that strip inline data URLs.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const ticketNumber = ticketId;

    const token = request.nextUrl.searchParams.get('token');
    if (!verifyTicketDownloadToken(ticketNumber, token)) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired ticket link.' },
        { status: 403 }
      );
    }

    const booking = await getBookingByTicket(ticketNumber);
    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const png = await generateQrPngBuffer(buildTicketVerificationUrl(ticketNumber));

    return new Response(png as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch (error) {
    console.error('[API QR] Generation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
