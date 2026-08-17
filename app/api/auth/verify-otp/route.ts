import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOtp, findOrCreateUserByIdentifier, verifyOtp as verifyOtpHash } from '@/lib/domain';
import { AUTH_COOKIE, GUEST_COOKIE, signValue, getCookieOptions, PLAYER_AUTH_MAX_AGE } from '@/lib/session';
import { getBaseUrl } from '@/lib/session';
import { isLockedOut, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit';
import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
  // Normally 6 digits; loosened to allow the 4-digit test bypass OTP
  // (see lib/otp-test-bypass.ts) — a wrong-length real OTP still fails the
  // underlying hash comparison, so this doesn't weaken real verification.
  otp: z.string().min(4).max(6),
  next: z.string().optional(),
});

// Only a same-site path is ever honored — a `next` value that isn't an
// internal path (e.g. an absolute/protocol-relative URL someone crafted
// into the query string) is dropped rather than followed, so this can't
// become an open redirect.
function safeNextPath(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );

  const isMobileNum = /^\+?[0-9\s\-]{10,18}$/.test(payload.identifier.trim());
  const cleanIdentifier = isMobileNum 
    ? normalizePhoneNumber(payload.identifier) 
    : payload.identifier;

  const isLocked = await isLockedOut(cleanIdentifier);
  const baseUrl = getBaseUrl(request);
  
  if (isLocked) {
    const msg = 'Too many failed attempts. You are locked out for 15 minutes.';
    if (!isJson) {
      return NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(cleanIdentifier)}&error=${encodeURIComponent(msg)}`, baseUrl));
    }
    return NextResponse.json({ success: false, message: msg }, { status: 403 });
  }

  const isValid = await verifyOtpHash(cleanIdentifier, payload.otp);

  if (!isValid) {
    const attempts = await recordFailedAttempt(cleanIdentifier);
    const remaining = 5 - attempts;
    const msg = remaining <= 0
      ? 'Too many failed attempts. You are locked out for 15 minutes.'
      : `Invalid OTP. ${remaining} attempts remaining.`;

    if (!isJson) {
      return NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(cleanIdentifier)}&error=${encodeURIComponent(msg)}`, baseUrl));
    }

    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }

  await resetAttempts(cleanIdentifier);
  const user = await findOrCreateUserByIdentifier(cleanIdentifier);
  await removeOtp(cleanIdentifier);

  const roleRedirect = user?.role === 'super_admin' ? '/fg-admin/platform/super-admin'
    : user?.role === 'arena_admin' ? '/fg-admin/platform/super-admin'
    : user?.role === 'manager' ? '/fg-admin/arena/dashboard'
    : user?.role === 'security' ? '/fg-admin/security/scan'
    : '/dashboard';
  // `next` (e.g. back to checkout with the original slot selection) only
  // applies to a genuine customer login — a staff role logging in via OTP
  // always lands on their own dashboard regardless of what `next` was set to.
  const isStaffRole = user?.role === 'super_admin' || user?.role === 'arena_admin' || user?.role === 'manager' || user?.role === 'security';
  const redirectUrl = (!isStaffRole && safeNextPath(payload.next)) || roleRedirect;

  const response = NextResponse.json({ success: true, userExists: Boolean(user), redirect: redirectUrl });
  let redirectResponse = NextResponse.redirect(new URL(redirectUrl, baseUrl), 303);
  // Persistent, not session-only — otherwise every closed browser/app forces
  // a fresh OTP re-login, which is exactly what was reported as broken.
  const cookieOpts = getCookieOptions(PLAYER_AUTH_MAX_AGE);

  if (user) {
    const signedUserId = await signValue(String(user.id));
    const signedRole = await signValue(String(user.role));
    response.cookies.set(AUTH_COOKIE, signedUserId, cookieOpts);
    response.cookies.set('fg_auth_role', signedRole, cookieOpts);
    redirectResponse.cookies.set(AUTH_COOKIE, signedUserId, cookieOpts);
    redirectResponse.cookies.set('fg_auth_role', signedRole, cookieOpts);
    redirectResponse.cookies.delete(GUEST_COOKIE);
  } else {
    response.cookies.set(GUEST_COOKIE, payload.identifier, cookieOpts);
    redirectResponse.cookies.set(GUEST_COOKIE, payload.identifier, cookieOpts);
  }

  if (!isJson) {
    return redirectResponse;
  }

  return response;
}