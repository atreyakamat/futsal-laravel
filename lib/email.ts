import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';

let sesClient: SESClient | null = null;

function getSES() {
  if (!sesClient && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    sesClient = new SESClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return sesClient;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

// SES's plain SendEmailCommand has no attachment support at all — it only
// accepts a Subject/Html/Text body. Attachments require hand-assembling a
// MIME message and sending it via SendRawEmailCommand instead.
function buildRawMimeEmail(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments: EmailAttachment[];
}): Buffer {
  const stamp = `${Date.now()}.${Math.random().toString(16).slice(2)}`;
  const mixedBoundary = `mixed-${stamp}`;
  const altBoundary = `alt-${stamp}`;
  const lines: string[] = [];

  lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  lines.push(`Subject: ${opts.subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  lines.push('');

  lines.push(`--${mixedBoundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push('');
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(opts.text || 'Please view this email in an HTML-compatible client.');
  lines.push('');
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(opts.html);
  lines.push('');
  lines.push(`--${altBoundary}--`);
  lines.push('');

  for (const att of opts.attachments) {
    lines.push(`--${mixedBoundary}`);
    lines.push(`Content-Type: ${att.contentType || 'application/pdf'}; name="${att.filename}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push('');
    lines.push(att.content.toString('base64').replace(/(.{76})/g, '$1\n'));
    lines.push('');
  }

  lines.push(`--${mixedBoundary}--`);

  return Buffer.from(lines.join('\r\n'), 'utf-8');
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.AWS_FROM_EMAIL || 'no-reply@aiemgoa.ac.in';

  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.warn('[EMAIL] AWS_ACCESS_KEY_ID not configured, skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const ses = getSES();
    if (!ses) throw new Error('SES client not initialized');

    if (options.attachments && options.attachments.length > 0) {
      const raw = buildRawMimeEmail({
        from: `AgnelArena <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
      await ses.send(new SendRawEmailCommand({ RawMessage: { Data: raw } }));
      console.info(`[EMAIL] Sent (${options.attachments.length} attachment(s)) to ${options.to}: ${options.subject}`);
      return { success: true };
    }

    const command = new SendEmailCommand({
      Source: `AgnelArena <${fromEmail}>`,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          ...(options.text ? {
            Text: {
              Data: options.text,
              Charset: 'UTF-8',
            }
          } : {})
        },
      },
    });

    await ses.send(command);
    console.info(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function generateOtpEmail(otp: string, identifier: string): { subject: string; html: string; text: string } {
  const subject = `Your AgnelArena OTP: ${otp}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0df220; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #050505; margin: 0; font-size: 28px; font-weight: 900;">AGNEL<span style="color: #050505;">ARENA</span></h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a1a1a; margin-top: 0;">Your Verification Code</h2>
        <p>Enter this 6-digit code to complete your login:</p>
        <div style="background: #f5f5f5; border: 2px dashed #0df220; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #050505; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">AgnelArena - Premium Turf Booking in Goa</p>
      </div>
    </body>
    </html>
  `;
  const text = `Your AgnelArena OTP is: ${otp}. Valid for 10 minutes.`;
  return { subject, html, text };
}

export function generateBookingConfirmationEmail(
  bookingRef: string,
  arenaName: string,
  arenaAddress: string,
  bookingDate: string,
  timeSlots: string[],
  customerName: string,
  totalAmount: number,
  ticketNumbers: string[],
  qrCodeUrl: string,
  payAtVenue: boolean = false,
  ticketDownloadUrl?: string,
  invoiceDownloadUrl?: string
): { subject: string; html: string; text: string } {
  const subject = `Booking Confirmed: ${bookingRef} - ${arenaName}`;
  const mergedSlots = timeSlots.join(', ');
  const arenaRowValue = arenaAddress ? `${arenaName}<br><span style="font-weight: 400; color: #999; font-size: 12px;">${arenaAddress}</span>` : arenaName;
  const amountRowLabel = payAtVenue ? 'Amount Due At Venue' : 'Amount Paid';
  // Attachments can be stripped by some mail gateways/size limits — these
  // hosted download links are the fallback so the ticket/invoice are
  // reachable even if the attached PDFs never arrive.
  const downloadButton = (label: string, url: string) =>
    `<a href="${url}" style="display: inline-block; background: #0df220; color: #050505; font-weight: 900; font-size: 13px; text-decoration: none; padding: 12px 20px; border-radius: 8px; margin: 6px;">${label}</a>`;
  const downloadButtonsHtml = (ticketDownloadUrl || invoiceDownloadUrl)
    ? `<div style="text-align: center; margin: 20px 0;">
         ${ticketDownloadUrl ? downloadButton('Download Ticket (PDF)', ticketDownloadUrl) : ''}
         ${invoiceDownloadUrl ? downloadButton('Download Invoice (PDF)', invoiceDownloadUrl) : ''}
       </div>`
    : '';
  const payAtVenueNotice = payAtVenue
    ? `<div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 8px; padding: 16px; margin: 20px 0; color: #7a5c00; font-size: 14px;">
         <strong>Pay at the venue:</strong> Your slot is reserved. Please pay ₹${totalAmount.toFixed(2)} at the venue via UPI before or when you arrive, and show your ticket to staff to confirm payment.
       </div>`
    : '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0df220; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #050505; margin: 0; font-size: 28px; font-weight: 900;">AGNEL<span style="color: #050505;">ARENA</span></h1>
        <p style="color: #050505; margin: 10px 0 0; font-size: 14px;">Booking Confirmed!</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a1a1a; margin-top: 0;">Hi ${customerName},</h2>
        <p>Your booking has been confirmed. Here are your details:</p>
        
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Booking Reference</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${bookingRef}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px; vertical-align: top;">Arena</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${arenaRowValue}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Date</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${new Date(bookingDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Time Slots</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0df220;">${mergedSlots}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Tickets</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${ticketNumbers.join(', ')}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">${amountRowLabel}</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">₹${totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>
        ${payAtVenueNotice}

        <div style="text-align: center; margin: 30px 0;">
          <img src="${qrCodeUrl}" alt="QR Code Ticket" style="width: 150px; height: 150px; border: 4px solid #0df220; border-radius: 12px; background: white; padding: 8px;">
          <p style="color: #666; font-size: 12px; margin-top: 10px;">Show this QR code at the arena for entry</p>
        </div>

        <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #5d4037; font-size: 14px;"><strong>Important:</strong> Arrive 10 minutes before your slot. Present this QR code to security staff for entry.</p>
        </div>

        ${downloadButtonsHtml}

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">AgnelArena - Premium Turf Booking in Goa</p>
      </div>
    </body>
    </html>
  `;
  const text = `Booking Confirmed: ${bookingRef} at ${arenaName} on ${bookingDate} for ${mergedSlots}. Amount: ₹${totalAmount.toFixed(2)}. Tickets: ${ticketNumbers.join(', ')}.`;
  return { subject, html, text };
}

export function generateRefundCompletedEmail(
  bookingRef: string,
  arenaName: string,
  customerName: string,
  refundAmount: number
): { subject: string; html: string; text: string } {
  const subject = `Refund Completed: ${bookingRef} - ${arenaName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0df220; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #050505; margin: 0; font-size: 28px; font-weight: 900;">AGNEL<span style="color: #050505;">ARENA</span></h1>
        <p style="color: #050505; margin: 10px 0 0; font-size: 14px;">Refund Completed</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a1a1a; margin-top: 0;">Hi ${customerName},</h2>
        <p>Your refund for the cancelled booking below has been completed by PayU and should reflect in your original payment method shortly.</p>

        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Booking Reference</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${bookingRef}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Arena</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${arenaName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Refund Amount</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0df220;">₹${refundAmount.toFixed(2)}</td></tr>
          </table>
        </div>

        <p style="color: #666; font-size: 14px;">Refunds typically take a few business days to appear in your bank/UPI account, depending on your bank.</p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">AgnelArena - Premium Turf Booking in Goa</p>
      </div>
    </body>
    </html>
  `;
  const text = `Refund of ₹${refundAmount.toFixed(2)} for booking ${bookingRef} at ${arenaName} has been completed.`;
  return { subject, html, text };
}

export interface DigestBookingRow {
  arena_name: string;
  time_slot: string;
  customer_name: string;
  customer_mobile: string;
  amount: number;
}

export interface DigestArenaSummary {
  arena_name: string;
  count: number;
  revenue: number;
}

export function generateDailyDigestEmail(params: {
  scopeLabel: string; // e.g. "All Turfs" or a specific arena name
  todayDate: string;
  tomorrowDate: string;
  todaySummary: DigestArenaSummary[];
  tomorrowSummary: DigestArenaSummary[];
  todayBookings: DigestBookingRow[];
  tomorrowBookings: DigestBookingRow[];
}): { subject: string; html: string; text: string } {
  const { scopeLabel, todayDate, tomorrowDate, todaySummary, tomorrowSummary, todayBookings, tomorrowBookings } = params;
  const subject = `Daily Booking Digest (${scopeLabel}) — ${todayDate}`;

  const summaryRow = (s: DigestArenaSummary) =>
    `<tr><td style="padding: 6px 0; color: #666; font-size: 13px;">${s.arena_name}</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${s.count} bookings</td><td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0d9f1a;">₹${s.revenue.toFixed(2)}</td></tr>`;

  const bookingRow = (b: DigestBookingRow) =>
    `<tr><td style="padding: 5px 0; font-size: 12px;">${b.time_slot}</td><td style="padding: 5px 0; font-size: 12px;">${b.arena_name}</td><td style="padding: 5px 0; font-size: 12px;">${b.customer_name} (${b.customer_mobile})</td><td style="padding: 5px 0; font-size: 12px; text-align: right;">₹${b.amount.toFixed(2)}</td></tr>`;

  const section = (label: string, date: string, summary: DigestArenaSummary[], bookings: DigestBookingRow[]) => {
    const totalCount = summary.reduce((s, r) => s + r.count, 0);
    const totalRevenue = summary.reduce((s, r) => s + r.revenue, 0);
    if (totalCount === 0) {
      return `<h3 style="color: #1a1a1a; margin: 24px 0 8px;">${label} — ${date}</h3><p style="color: #999; font-size: 13px;">No confirmed bookings.</p>`;
    }
    return `
      <h3 style="color: #1a1a1a; margin: 24px 0 8px;">${label} — ${date} (${totalCount} bookings, ₹${totalRevenue.toFixed(2)})</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">${summary.map(summaryRow).join('')}</table>
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e5e5e5; padding-top: 8px;">
        <tr><th style="text-align:left; font-size: 11px; color: #999; padding: 6px 0;">SLOT</th><th style="text-align:left; font-size: 11px; color: #999;">TURF</th><th style="text-align:left; font-size: 11px; color: #999;">CUSTOMER</th><th style="text-align:right; font-size: 11px; color: #999;">AMOUNT</th></tr>
        ${bookings.map(bookingRow).join('')}
      </table>`;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: #0df220; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #050505; margin: 0; font-size: 28px; font-weight: 900;">AGNEL<span style="color: #050505;">ARENA</span></h1>
        <p style="color: #050505; margin: 10px 0 0; font-size: 14px;">Daily Booking Digest — ${scopeLabel}</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        ${section('Today', todayDate, todaySummary, todayBookings)}
        ${section('Tomorrow', tomorrowDate, tomorrowSummary, tomorrowBookings)}
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0 12px;">
        <p style="color: #999; font-size: 12px; text-align: center;">AgnelArena — Automated Daily Digest, sent 8:00 PM IST</p>
      </div>
    </body>
    </html>
  `;
  const text = `Daily Booking Digest (${scopeLabel}) — Today ${todayDate}: ${todaySummary.reduce((s, r) => s + r.count, 0)} bookings. Tomorrow ${tomorrowDate}: ${tomorrowSummary.reduce((s, r) => s + r.count, 0)} bookings.`;
  return { subject, html, text };
}

export function generateApprovalNotificationEmail(
  requestType: string,
  arenaName: string,
  status: 'approved' | 'rejected',
  reason?: string
): { subject: string; html: string; text: string } {
  const isApproved = status === 'approved';
  const subject = `Approval ${isApproved ? 'Approved' : 'Rejected'}: ${requestType} for ${arenaName}`;
  const statusColor = isApproved ? '#0df220' : '#ef4444';
  const statusText = isApproved ? 'APPROVED' : 'REJECTED';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${statusColor}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">AGNEL<span style="color: white;">ARENA</span></h1>
        <p style="color: white; margin: 10px 0 0; font-size: 14px;">Request ${statusText}</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a1a1a; margin-top: 0;">Request Update</h2>
        <p>Your request for <strong>${requestType.replace(/_/g, ' ')}</strong> at <strong>${arenaName}</strong> has been <strong style="color: ${statusColor};">${statusText}</strong>.</p>
        
        ${reason ? `
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #666;"><strong>Reason:</strong> ${reason}</p>
        </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">AgnelArena - Platform Administration</p>
      </div>
    </body>
    </html>
  `;
  const text = `Your ${requestType} request for ${arenaName} has been ${statusText}.${reason ? ` Reason: ${reason}` : ''}`;
  return { subject, html, text };
}