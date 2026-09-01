import { getArenaById, getBookingsByRef, queryOne } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import { sendEmail, generateBookingConfirmationEmail, generateRescheduleConfirmationEmail, type EmailAttachment } from '@/lib/email';
import { getSmsProvider } from '@/lib/sms';
import { notifyStaffOfNewBooking } from '@/lib/push';
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

  // Push alert to super_admin/admin/manager — every path that reaches this
  // function is a booking that just became real (paid online, free/offline,
  // or an admin-approved free/discounted booking), so this is the single
  // place to fire it from rather than duplicating the call at each call site.
  await notifyStaffOfNewBooking(bookingRef);

  // 1. Send SMS / WhatsApp Notification (contains ticket details to map template)
  if (firstBooking.customer_mobile) {
    const provider = getSmsProvider();
    try {
      const mergedSlots = mergeSlots(ticket.slots);
      const timeRange = mergedSlots.join(', '); // e.g. "17:00-18:00"
      const sent = await provider.sendSms(
        firstBooking.customer_mobile,
        `CONFIRMED|${ticket.bookingDate}|${timeRange}|${ticket.ticketNumbers[0] || ticket.bookingRef}|${bookingRef}|${ticket.customerName}`,
        { appUrl, arenaAddress: ticket.arenaAddress }
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
    const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com').replace(/\/$/, '');
    const qrUrl = getTicketQrEmailUrl(ticket.ticketNumbers[0] ?? ticket.bookingRef, appUrl);
    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);

    const downloadToken = generateTicketDownloadToken(ticket.bookingRef);
    const ticketDownloadUrl = `${baseUrl}/api/bookings/download?ref=${encodeURIComponent(ticket.bookingRef)}&token=${downloadToken}`;

    // Both the attached PDFs and these hosted-link buttons are built from
    // the same invoice row/lookup — attachments can be stripped by some
    // mail gateways or size limits, so the links are a fallback that still
    // works even if the attachment never arrives.
    const invoice = await queryOne<any>(`SELECT * FROM tax_invoices WHERE booking_ref = ? LIMIT 1`, [bookingRef]);
    const invoiceDownloadUrl = invoice
      ? `${baseUrl}/api/invoice/${encodeURIComponent(ticket.bookingRef)}?token=${downloadToken}`
      : undefined;

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
      payAtVenue,
      ticketDownloadUrl,
      invoiceDownloadUrl
    );

    // Attach the ticket (with its own embedded QR + venue address) and, if
    // one was issued, the GST tax invoice — best-effort, a PDF generation
    // failure here shouldn't stop the confirmation email itself from going
    // out with its inline QR and download-link buttons.
    const attachments: EmailAttachment[] = [];
    try {
      const ticketPdf = await generateTicketPdfBuffer(bookings, ticket.arenaName, ticket.arenaAddress);
      attachments.push({ filename: `ticket-${ticket.bookingRef}.pdf`, content: ticketPdf, contentType: 'application/pdf' });
    } catch (pdfErr) {
      console.error('[Email] Failed to build ticket PDF attachment:', pdfErr);
    }
    try {
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

/**
 * Sends the reissued ticket for a rescheduled booking — the new
 * booking_ref's ticket via WhatsApp + email, referencing the old ref so the
 * customer sees exactly what moved. Old ticket(s)/QR stop working the
 * moment lib/domain.ts's rescheduleBooking() runs (old rows flip to
 * payment_status='cancelled'), so this reissue is the only valid ticket
 * from that point on.
 */
export async function sendRescheduleTicketEmail(oldBookingRef: string, newBookingRef: string, appUrl?: string) {
  const [oldBookings, newTicket, newBookings] = await Promise.all([
    getBookingsByRef(oldBookingRef),
    getTicketPackage(newBookingRef),
    getBookingsByRef(newBookingRef),
  ]);

  const oldFirstBooking = oldBookings?.[0];
  const newFirstBooking = newBookings?.[0];
  if (!oldFirstBooking || !newTicket || !newFirstBooking) {
    return { sent: false, reason: 'Ticket not found' as const };
  }

  const oldSlots = mergeSlots(oldBookings.map((b) => b.time_slot));
  const newSlots = mergeSlots(newTicket.slots);

  // 1. WhatsApp
  if (newFirstBooking.customer_mobile) {
    const provider = getSmsProvider();
    try {
      const sent = await provider.sendSms(
        newFirstBooking.customer_mobile,
        `RESCHEDULED|${oldFirstBooking.booking_date}|${oldSlots.join(', ')}|${newTicket.bookingDate}|${newSlots.join(', ')}|${newTicket.ticketNumbers[0] || newBookingRef}|${newTicket.customerName}`,
        { appUrl, arenaAddress: newTicket.arenaAddress }
      );
      if (!sent) {
        console.error(`[WhatsApp Reschedule] Provider reported failure sending to ${newFirstBooking.customer_mobile}`);
      }
    } catch (smsErr) {
      console.error('[WhatsApp Reschedule] Failed to send via WhatsApp:', smsErr);
    }
  }

  // 2. Email
  if (newFirstBooking.customer_email) {
    const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com').replace(/\/$/, '');
    const qrUrl = getTicketQrEmailUrl(newTicket.ticketNumbers[0] ?? newBookingRef, appUrl);
    const newTotal = newBookings.reduce((sum, b) => sum + Number(b.amount), 0);

    const downloadToken = generateTicketDownloadToken(newTicket.bookingRef);
    const ticketDownloadUrl = `${baseUrl}/api/bookings/download?ref=${encodeURIComponent(newTicket.bookingRef)}&token=${downloadToken}`;

    const { subject, html, text } = generateRescheduleConfirmationEmail(
      newBookingRef,
      oldBookingRef,
      newTicket.arenaName,
      newTicket.arenaAddress,
      oldFirstBooking.booking_date,
      oldSlots,
      newTicket.bookingDate,
      newSlots,
      newTicket.customerName,
      newTotal,
      newTicket.ticketNumbers,
      qrUrl,
      ticketDownloadUrl
    );

    const attachments: EmailAttachment[] = [];
    try {
      const ticketPdf = await generateTicketPdfBuffer(newBookings, newTicket.arenaName, newTicket.arenaAddress);
      attachments.push({ filename: `ticket-${newBookingRef}.pdf`, content: ticketPdf, contentType: 'application/pdf' });
    } catch (pdfErr) {
      console.error('[Email] Failed to build reschedule ticket PDF attachment:', pdfErr);
    }

    const result = await sendEmail({ to: newFirstBooking.customer_email, subject, html, text, attachments });
    return { sent: result.success, mode: 'resend' as const, error: result.error };
  }

  return { sent: true };
}
