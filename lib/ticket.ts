import { getArenaById, getBookingsByRef, queryOne } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import { sendEmail, generateBookingConfirmationEmail, type EmailAttachment } from '@/lib/email';
import { getSmsProvider } from '@/lib/sms';
import { buildTicketVerificationUrl, generateQrDataUrl } from '@/lib/qr';
import { generateTicketDownloadToken } from '@/lib/ticket-token';
import { generateTicketPdfBuffer } from '@/lib/pdf';
import { generateTaxInvoicePdfBuffer } from '@/lib/gst-pdf';

export type TicketPackage = {
  bookingRef: string;
  arenaName: string;
  arenaAddress: string;
  customerName: string;
  bookingDate: string;
  ticketNumbers: string[];
  slots: string[];
};

export async function getTicketQrUrl(ticketNumber: string): Promise<string> {
  return generateQrDataUrl(buildTicketVerificationUrl(ticketNumber));
}

// A hosted PNG URL (app/api/ticket/[ticketId]/qr/route.ts), not a
// data:-URI — used specifically for email, since Gmail/Outlook strip or
// block inline data: image sources but render a normal hosted <img> fine.
// The in-app ticket page (buildTicketHtml, below) keeps using the data:
// URL version since a browser rendering its own page has no such
// restriction and it avoids an extra network round trip there.
export function getTicketQrEmailUrl(ticketNumber: string, appUrl?: string): string {
  const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com').replace(/\/$/, '');
  const token = generateTicketDownloadToken(ticketNumber);
  return `${baseUrl}/api/ticket/${encodeURIComponent(ticketNumber)}/qr?token=${token}`;
}

export async function buildTicketHtml(ticket: TicketPackage): Promise<string> {
  const mergedSlots = mergeSlots(ticket.slots);
  const qrUrl = await getTicketQrUrl(ticket.ticketNumbers[0] ?? ticket.bookingRef);
  const ticketNumbers = (ticket.ticketNumbers || []).join(', ');
  const downloadToken = generateTicketDownloadToken(ticket.bookingRef);
  const downloadHref = `/api/bookings/download?ref=${encodeURIComponent(ticket.bookingRef)}&token=${downloadToken}`;

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
    arenaAddress: arena.address || '',
    customerName: firstBooking.customer_name,
    bookingDate: firstBooking.booking_date,
    ticketNumbers: bookings.map((booking) => booking.ticket_number).filter(Boolean) as string[],
    slots: bookings.map((booking) => booking.time_slot),
  };
}

export async function sendTicketEmail(bookingRef: string, appUrl?: string) {
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
      const sent = await provider.sendSms(
        firstBooking.customer_mobile,
        `CONFIRMED|${ticket.bookingDate}|${timeRange}|${ticket.ticketNumbers[0] || ticket.bookingRef}|${bookingRef}|${ticket.customerName}`,
        { appUrl }
      );
      if (!sent) {
        console.error(`[WhatsApp Ticket] Provider reported failure sending ticket to ${firstBooking.customer_mobile}`);
      }
    } catch (smsErr) {
      console.error('[WhatsApp Ticket] Failed to send ticket via WhatsApp:', smsErr);
    }
  }

  // 2. Send Email Notification
  if (firstBooking.customer_email) {
    const qrUrl = getTicketQrEmailUrl(ticket.ticketNumbers[0] ?? ticket.bookingRef, appUrl);
    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);

    const payAtVenue = firstBooking.payment_method === 'offline' && firstBooking.venue_payment_status !== 'PAID';
    const { subject, html, text } = generateBookingConfirmationEmail(
      ticket.bookingRef,
      ticket.arenaName,
      ticket.arenaAddress,
      ticket.bookingDate,
      ticket.slots,
      ticket.customerName,
      totalAmount,
      ticket.ticketNumbers,
      qrUrl,
      payAtVenue
    );

    // Attach the ticket (with its own embedded QR + venue address) and, if
    // one was issued, the GST tax invoice — best-effort, a PDF generation
    // failure here shouldn't stop the confirmation email itself from going
    // out with its inline QR.
    const attachments: EmailAttachment[] = [];
    try {
      const ticketPdf = await generateTicketPdfBuffer(bookings, ticket.arenaName, ticket.arenaAddress);
      attachments.push({ filename: `ticket-${ticket.bookingRef}.pdf`, content: ticketPdf, contentType: 'application/pdf' });
    } catch (pdfErr) {
      console.error('[Email] Failed to build ticket PDF attachment:', pdfErr);
    }
    try {
      const invoice = await queryOne<any>(`SELECT * FROM tax_invoices WHERE booking_ref = ? LIMIT 1`, [bookingRef]);
      if (invoice) {
        const invoicePdf = await generateTaxInvoicePdfBuffer(invoice);
        attachments.push({ filename: `${invoice.invoice_no}.pdf`, content: invoicePdf, contentType: 'application/pdf' });
      }
    } catch (invoiceErr) {
      console.error('[Email] Failed to build invoice PDF attachment:', invoiceErr);
    }

    const result = await sendEmail({ to: firstBooking.customer_email, subject, html, text, attachments });
    return { sent: result.success, mode: 'resend' as const, error: result.error };
  }

  return { sent: true };
}
