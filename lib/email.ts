import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

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

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
  bookingDate: string,
  timeSlots: string[],
  customerName: string,
  totalAmount: number,
  ticketNumbers: string[],
  qrCodeUrl: string
): { subject: string; html: string; text: string } {
  const subject = `Booking Confirmed: ${bookingRef} - ${arenaName}`;
  const mergedSlots = timeSlots.join(', ');
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
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Arena</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${arenaName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Date</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${new Date(bookingDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Time Slots</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #0df220;">${mergedSlots}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Tickets</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">${ticketNumbers.join(', ')}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Amount Paid</td><td style="padding: 8px 0; font-weight: 700; text-align: right;">₹${totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <img src="${qrCodeUrl}" alt="QR Code Ticket" style="width: 150px; height: 150px; border: 4px solid #0df220; border-radius: 12px; background: white; padding: 8px;">
          <p style="color: #666; font-size: 12px; margin-top: 10px;">Show this QR code at the arena for entry</p>
        </div>

        <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #5d4037; font-size: 14px;"><strong>Important:</strong> Arrive 10 minutes before your slot. Present this QR code to security staff for entry.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">AgnelArena - Premium Turf Booking in Goa</p>
      </div>
    </body>
    </html>
  `;
  const text = `Booking Confirmed: ${bookingRef} at ${arenaName} on ${bookingDate} for ${mergedSlots}. Amount: ₹${totalAmount.toFixed(2)}. Tickets: ${ticketNumbers.join(', ')}.`;
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