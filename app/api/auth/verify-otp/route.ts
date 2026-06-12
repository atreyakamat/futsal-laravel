import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOtp, findUserByIdentifier, verifyOtp as verifyOtpHash } from '@/lib/domain';
import { AUTH_COOKIE, GUEST_COOKIE, signValue, getCookieOptions } from '@/lib/session';
import { isLockedOut, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );

  const isLocked = await isLockedOut(payload.identifier);
  if (isLocked) {
    const msg = 'Too many failed attempts. You are locked out for 15 minutes.';
    if (!isJson) {
      return NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(payload.identifier)}&error=${encodeURIComponent(msg)}`, request.url));
    }
    return NextResponse.json({ success: false, message: msg }, { status: 403 });
  }

  const isValid = await verifyOtpHash(payload.identifier, payload.otp);

  if (!isValid) {
    const attempts = await recordFailedAttempt(payload.identifier);
    const remaining = 5 - attempts;
    const msg = remaining <= 0
      ? 'Too many failed attempts. You are locked out for 15 minutes.'
      : `Invalid OTP. ${remaining} attempts remaining.`;

    if (!isJson) {
      return NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(payload.identifier)}&error=${encodeURIComponent(msg)}`, request.url));
    }

    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }

  await resetAttempts(payload.identifier);
  const user = await findUserByIdentifier(payload.identifier);
  await removeOtp(payload.identifier);

  const response = NextResponse.json({ success: true, userExists: Boolean(user) });
  let redirectResponse = NextResponse.redirect(new URL('/', request.url));
  const cookieOpts = getCookieOptions();

  if (user) {
    const signedUserId = signValue(String(user.id));
    response.cookies.set(AUTH_COOKIE, signedUserId, cookieOpts);
    redirectResponse.cookies.set(AUTH_COOKIE, signedUserId, cookieOpts);
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