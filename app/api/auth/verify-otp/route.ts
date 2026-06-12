import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOtp, findUserByIdentifier, verifyOtp as verifyOtpHash } from '@/lib/domain';
import { AUTH_COOKIE, GUEST_COOKIE, signValue } from '@/lib/session';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const isValid = await verifyOtpHash(payload.identifier, payload.otp);

  if (!isValid) {
    if (!isJson) {
      return NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(payload.identifier)}&error=1`, request.url));
    }

    return NextResponse.json({ success: false, message: 'Invalid or expired OTP.' }, { status: 400 });
  }

  const user = await findUserByIdentifier(payload.identifier);
  await removeOtp(payload.identifier);

  const response = NextResponse.json({ success: true, userExists: Boolean(user) });
  let redirectResponse = NextResponse.redirect(new URL('/', request.url));

  if (user) {
    const signedUserId = signValue(String(user.id));
    response.cookies.set(AUTH_COOKIE, signedUserId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    redirectResponse.cookies.set(AUTH_COOKIE, signedUserId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    redirectResponse.cookies.delete(GUEST_COOKIE);
  } else {
    response.cookies.set(GUEST_COOKIE, payload.identifier, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    redirectResponse.cookies.set(GUEST_COOKIE, payload.identifier, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  if (!isJson) {
    return redirectResponse;
  }

  return response;
}