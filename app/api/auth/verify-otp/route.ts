import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOtp, findOrCreateUserByIdentifier, verifyOtp as verifyOtpHash } from '@/lib/domain';
import { AUTH_COOKIE, GUEST_COOKIE, signValue, getCookieOptions } from '@/lib/session';
import { getBaseUrl } from '@/lib/session';
import { isLockedOut, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit';
import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
  otp: z.string().length(6),
});

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

  const redirectUrl = user?.role === 'super_admin' ? '/fg-admin/platform/super-admin' 
    : user?.role === 'arena_admin' ? '/fg-admin/arena/dashboard'
    : user?.role === 'security' ? '/fg-admin/security/scan'
    : '/dashboard';

  const response = NextResponse.json({ success: true, userExists: Boolean(user), redirect: redirectUrl });
  let redirectResponse = NextResponse.redirect(new URL(redirectUrl, baseUrl), 303);
  const cookieOpts = getCookieOptions();

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