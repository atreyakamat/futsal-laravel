import QRCode from 'qrcode';

export function buildTicketVerificationUrl(ticketNumber: string, baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  return `${normalizedBaseUrl}/verify-ticket?ticket=${encodeURIComponent(ticketNumber)}`;
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
