import { getArenaById, getBookingsByRef } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import { sendEmail, generateBookingConfirmationEmail } from '@/lib/email';
import { getSmsProvider } from '@/lib/sms';

export type TicketPackage = {
  bookingRef: string;
  arenaName: string;
  customerName: string;
  bookingDate: string;
  ticketNumbers: string[];
  slots: string[];
};

export async function getTicketQrUrl(ticketNumber: string): Promise<string> {
  return generateQrDataUrl(ticketNumber);
}

export async function buildTicketHtml(ticket: TicketPackage): Promise<string> {
  const mergedSlots = mergeSlots(ticket.slots);
  const qrUrl = await getTicketQrUrl(ticket.ticketNumbers[0] ?? ticket.bookingRef);
  const ticketNumbers = (ticket.ticketNumbers || []).join(', ');
  const downloadHref = `/booking/ticket/${encodeURIComponent(ticket.bookingRef)}?download=1`;

  return `
      <div class="card">
        <div class="muted">AgnelArena Ticket</div>
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
      </div>`;
}

export async function getTicketPackage(bookingRef: string): Promise<TicketPackage | null> {
  const bookings = await getBookingsByRef(bookingRef);
  if (!bookings || bookings?.length === 0) return null;

  const firstBooking = bookings[0];
  if (!firstBooking) return null;

  const arena = await getArenaById(firstBooking.arena_id);
  if (!arena) return null;

  return {
    bookingRef,
    arenaName: arena.name,
    customerName: firstBooking.customer_name,
    bookingDate: firstBooking.booking_date,
    ticketNumbers: bookings.map((booking) => booking.ticket_number).filter(Boolean) as string[],
    slots: bookings.map((booking) => booking.time_slot),
  };
}

export async function sendTicketEmail(bookingRef: string) {
  const ticket = await getTicketPackage(bookingRef);
  if (!ticket) {
    return { sent: false, reason: 'Ticket not found' as const };
  }

  const bookings = await getBookingsByRef(bookingRef);
  const firstBooking = bookings?.[0];
  if (!firstBooking) {
    return { sent: false, reason: 'No recipient booking found' as const };
  }

  // 1. Send SMS / WhatsApp Notification (contains ticket details to map template)
  if (firstBooking.customer_mobile) {
    const provider = getSmsProvider();
    try {
      const mergedSlots = mergeSlots(ticket.slots);
      const timeRange = mergedSlots.join(', '); // e.g. "17:00-18:00"
      await provider.sendSms(
        firstBooking.customer_mobile,
        `CONFIRMED|${ticket.bookingDate}|${timeRange}|${ticket.ticketNumbers[0] || ticket.bookingRef}|${bookingRef}|${ticket.customerName}`
      );
    } catch (smsErr) {
      console.error('[WhatsApp Ticket] Failed to send ticket via WhatsApp:', smsErr);
    }
  }

  // 2. Send Email Notification
  if (firstBooking.customer_email) {
    const qrUrl = await getTicketQrUrl(ticket.ticketNumbers[0] ?? ticket.bookingRef);
    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);

    const { subject, html, text } = generateBookingConfirmationEmail(
      ticket.bookingRef,
      ticket.arenaName,
      ticket.bookingDate,
      ticket.slots,
      ticket.customerName,
      totalAmount,
      ticket.ticketNumbers,
      qrUrl
    );

    const result = await sendEmail({ to: firstBooking.customer_email, subject, html, text });
    return { sent: result.success, mode: 'resend' as const, error: result.error };
  }

  return { sent: true };
}
