import { getBookingsByRef, getArenaById } from '@/lib/domain';
import { generateTicketPdfBuffer } from '@/lib/pdf';
import { verifyTicketDownloadToken } from '@/lib/ticket-token';

export async function GET(request: Request, context: { params: Promise<{ ref: string }> }) {
  const { ref } = await context.params;
  const token = new URL(request.url).searchParams.get('token');

  if (!verifyTicketDownloadToken(ref, token)) {
    return new Response('Invalid or expired download link.', { status: 403, headers: { 'Content-Type': 'text/plain' } });
  }

  const bookings = await getBookingsByRef(ref);

  if (!bookings || bookings.length === 0) {
    return new Response('Ticket not found.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const arena = await getArenaById(bookings[0].arena_id);
  const arenaName = arena?.name || 'Futsal Arena';
  const arenaAddress = arena?.address || 'Assagao, Goa';
  const pdfBuffer = await generateTicketPdfBuffer(bookings, arenaName, arenaAddress);

  return new Response(pdfBuffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${bookings[0].ticket_number}.pdf"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
