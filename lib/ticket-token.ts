import { signValue, unsignValue } from '@/lib/session';

// Generous but bounded — tickets are commonly re-downloaded well after the
// play date for record-keeping, but shouldn't stay valid forever.
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Signed, expiring token proving the holder was actually issued this
 * ticket/booking (via the WhatsApp/email link, or the post-checkout success
 * page) — not just someone who guessed or brute-forced the identifier.
 * Reuses the same HMAC primitive already used for session cookies.
 */
export function generateTicketDownloadToken(identifier: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${identifier}|${expiresAt}`;
  return encodeURIComponent(signValue(payload));
}

export function verifyTicketDownloadToken(identifier: string, token: string | null | undefined): boolean {
  if (!token) return false;

  let unsigned: string | null;
  try {
    unsigned = unsignValue(decodeURIComponent(token));
  } catch {
    return false;
  }
  if (!unsigned) return false;

  const separatorIndex = unsigned.lastIndexOf('|');
  if (separatorIndex === -1) return false;

  const tokenIdentifier = unsigned.slice(0, separatorIndex);
  const expiresAt = Number(unsigned.slice(separatorIndex + 1));

  if (tokenIdentifier !== identifier) return false;
  if (!expiresAt || Date.now() > expiresAt) return false;

  return true;
}
