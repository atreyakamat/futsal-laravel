import { getArenaById, getBookingsByRef } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';

export type TicketPackage = {
  bookingRef: string;
  arenaName: string;
  customerName: string;
  bookingDate: string;
  ticketNumbers: string[];
  slots: string[];
};

export function getTicketQrUrl(ticketNumber: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketNumber)}`;
}

export function buildTicketHtml(ticket: TicketPackage) {
  const mergedSlots = mergeSlots(ticket.slots);
  const qrUrl = getTicketQrUrl(ticket.ticketNumbers[0] ?? ticket.bookingRef);
  const ticketNumbers = ticket.ticketNumbers.join(', ');
  const downloadHref = `/booking/ticket/${encodeURIComponent(ticket.bookingRef)}?download=1`;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ticket ${ticket.bookingRef}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #07111f; color: #eff6ff; margin: 0; padding: 24px; }
        .card { max-width: 720px; margin: 0 auto; background: rgba(10, 20, 35, 0.96); border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; padding: 28px; }
        .muted { color: #9fb4cc; }
        .title { font-size: 30px; margin: 0 0 10px; }
        .row { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 20px; }
        .pill { border: 1px solid rgba(13,242,32,0.3); color: #0df220; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
        .btn { display: inline-block; margin-top: 20px; padding: 12px 16px; background: #0df220; color: #07111f; text-decoration: none; font-weight: bold; border-radius: 999px; }
        .qr { width: 180px; height: 180px; border-radius: 18px; background: white; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="muted">FutsalGoa Ticket</div>
        <h1 class="title">${ticket.bookingRef}</h1>
        <div class="row">
          <div>
            <div class="muted">Name</div>
            <strong>${ticket.customerName}</strong>
          </div>
          <div>
            <div class="muted">Arena</div>
            <strong>${ticket.arenaName}</strong>
          </div>
          <div>
            <div class="muted">Date</div>
            <strong>${ticket.bookingDate}</strong>
          </div>
        </div>
        <div class="row">
          <div class="pill">${mergedSlots.join(', ')}</div>
          <div class="pill">${getDurationText(ticket.slots)}</div>
        </div>
        <div style="margin-top: 24px;">
          <img class="qr" src="${qrUrl}" alt="QR code ticket" />
        </div>
        <p class="muted">Ticket numbers: ${ticketNumbers}</p>
        <a class="btn" href="${downloadHref}">Download ticket</a>
      </div>
    </body>
  </html>`;
}

export async function getTicketPackage(bookingRef: string): Promise<TicketPackage | null> {
  const bookings = await getBookingsByRef(bookingRef);
  if (bookings.length === 0) return null;

  const arena = await getArenaById(bookings[0].arena_id);
  if (!arena) return null;

  return {
    bookingRef,
    arenaName: arena.name,
    customerName: bookings[0].customer_name,
    bookingDate: bookings[0].booking_date,
    ticketNumbers: bookings.map((booking) => booking.ticket_number).filter(Boolean) as string[],
    slots: bookings.map((booking) => booking.time_slot),
  };
}

export async function sendTicketEmail(bookingRef: string) {
  const ticket = await getTicketPackage(bookingRef);
  if (!ticket) {
    return { sent: false, reason: 'Ticket not found' as const };
  }

  const firstBooking = (await getBookingsByRef(bookingRef))[0];
  const recipient = firstBooking.customer_email;
  if (!recipient) {
    return { sent: false, reason: 'No recipient email' as const };
  }

  const html = buildTicketHtml(ticket);
  const subject = `Your FutsalGoa ticket ${bookingRef}`;
  console.info(`[TICKET EMAIL LOG] To: ${recipient}\nSubject: ${subject}\n${html}`);
  return { sent: true, mode: 'log' as const };
}
