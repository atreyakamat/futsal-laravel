import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeOtp } from '@/lib/domain';
import { GUEST_COOKIE, getCookieOptions } from '@/lib/session';
import { canSendOtp, isLockedOut } from '@/lib/rate-limit';
import { getSmsProvider } from '@/lib/sms';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );

  const allowed = await canSendOtp(payload.identifier);
  if (!allowed) {
    const isLocked = await isLockedOut(payload.identifier);
    const msg = isLocked
      ? 'Too many failed attempts. You are locked out for 15 minutes.'
      : 'Please wait 60 seconds before requesting another OTP.';

    if (!isJson) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
    }
    return NextResponse.json({ success: false, message: msg }, { status: 429 });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  await storeOtp(payload.identifier, otp);
  console.info(`[OTP] ${payload.identifier}: ${otp}`);

  // Trigger SMS Provider if identifier is a mobile number
  const isMobile = /^\+?[0-9]{10,15}$/.test(payload.identifier.trim());
  if (isMobile) {
    const provider = getSmsProvider();
    try {
      await provider.sendSms(
        payload.identifier.trim(),
        `Your OTP for FutsalGoa is ${otp}. Valid for 10 minutes.`
      );
    } catch (smsErr) {
      console.error('[SMS] Failed to send SMS via provider:', smsErr);
    }
  }

  if (!isJson) {
    const response = NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(payload.identifier)}`, request.url));
    response.cookies.set(GUEST_COOKIE, payload.identifier, getCookieOptions());
    return response;
  }

  return NextResponse.json({ success: true, message: 'OTP generated.' });
}