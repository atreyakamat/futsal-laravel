import { signValue, unsignValue } from '@/lib/session';

// Same trust model as a password-reset email link: whoever holds this
// specific link can act, no separate login required. Bounded window so an
// old, unactioned email can't be used indefinitely.
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export type ApprovalAction = 'approve' | 'decline';

/**
 * Signed, expiring token binding one specific approval_requests row to one
 * specific decision (approve/decline) AND the specific admin the email was
 * sent to — reuses the same HMAC primitive already used for session cookies
 * and ticket-download links (lib/ticket-token.ts). Each recipient gets their
 * own token pair (generated per-recipient, not shared) so the audit trail
 * still records who actually clicked, even without a login. Single-use in
 * effect: resolveApprovalRequest only ever acts on a request that's still
 * 'pending', so a second click (by the same or a different recipient, via
 * either link) is a no-op, not a double-apply.
 */
export function generateApprovalActionToken(requestId: number, action: ApprovalAction, adminId: number, ttlMs: number = DEFAULT_TTL_MS): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${requestId}|${action}|${adminId}|${expiresAt}`;
  return encodeURIComponent(signValue(payload));
}

export function verifyApprovalActionToken(token: string | null | undefined): { requestId: number; action: ApprovalAction; adminId: number } | null {
  if (!token) return null;

  let unsigned: string | null;
  try {
    unsigned = unsignValue(decodeURIComponent(token));
  } catch {
    return null;
  }
  if (!unsigned) return null;

  const parts = unsigned.split('|');
  if (parts.length !== 4) return null;

  const [requestIdStr, action, adminIdStr, expiresAtStr] = parts;
  const requestId = Number(requestIdStr);
  const adminId = Number(adminIdStr);
  const expiresAt = Number(expiresAtStr);

  if (!requestId || Number.isNaN(requestId)) return null;
  if (action !== 'approve' && action !== 'decline') return null;
  if (!adminId || Number.isNaN(adminId)) return null;
  if (!expiresAt || Date.now() > expiresAt) return null;

  return { requestId, action, adminId };
}
