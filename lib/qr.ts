import QRCode from 'qrcode';

export function buildTicketVerificationUrl(ticketNumber: string, baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  return `${normalizedBaseUrl}/verify-ticket?ticket=${encodeURIComponent(ticketNumber)}`;
}

/**
 * Builds a standard UPI deep-link payment URI so wallet apps can pre-fill the
 * venue's VPA, the exact booking amount, and the booking ref as a note.
 */
export function buildUpiPaymentUri(params: { vpa: string; payeeName: string; amount: number; note: string }): string {
  const search = new URLSearchParams({
    pa: params.vpa,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: 'INR',
    tn: params.note,
  });
  return `upi://pay?${search.toString()}`;
}

/**
 * Generates a local QR code as a Base64-encoded PNG Data URL (data:image/png;base64,...).
 * No external API dependencies or networks requests are performed.
 *
 * @param text The string payload to encode in the QR code (e.g., ticket number)
 * @returns A promise that resolves to the QR code base64 image string.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
  } catch (err) {
    console.error('[QR] Local QR generation error:', err);
    throw err;
  }
}

/**
 * Same QR code as generateQrDataUrl, as raw PNG bytes instead of a
 * data: URL. Most email clients (Gmail, Outlook) strip or block
 * data:-URI <img> sources as a spam/tracking precaution, so email HTML
 * needs a real hosted image URL — see app/api/ticket/[ticketId]/qr/route.ts.
 */
export async function generateQrPngBuffer(text: string): Promise<Buffer> {
  try {
    return await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
  } catch (err) {
    console.error('[QR] Local QR generation error:', err);
    throw err;
  }
}
