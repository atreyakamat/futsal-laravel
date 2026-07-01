import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeOtp } from '@/lib/domain';
import { GUEST_COOKIE, getCookieOptions } from '@/lib/session';
import { canSendOtp, isLockedOut } from '@/lib/rate-limit';
import { getSmsProvider } from '@/lib/sms';
import { sendEmail, generateOtpEmail } from '@/lib/email';

import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
});

const isEmail = (identifier: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
const isMobile = (identifier: string) => /^\+?[0-9\s\-]{10,18}$/.test(identifier.trim());

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );

  const isMobileNum = isMobile(payload.identifier);
  if (!isMobileNum) {
    const msg = 'Only mobile number login is supported. Please enter a valid mobile number.';
    if (!isJson) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
    }
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }

  const cleanIdentifier = normalizePhoneNumber(payload.identifier);

  const allowed = await canSendOtp(cleanIdentifier);
  if (!allowed) {
    const isLocked = await isLockedOut(cleanIdentifier);
    const msg = isLocked
      ? 'Too many failed attempts. You are locked out for 15 minutes.'
      : 'Please wait 60 seconds before requesting another OTP.';

    if (!isJson) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
    }
    return NextResponse.json({ success: false, message: msg }, { status: 429 });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  await storeOtp(cleanIdentifier, otp);
  console.info(`[OTP] ${cleanIdentifier}: ${otp}`);

  // Send email if identifier is an email
  if (isEmail(cleanIdentifier)) {
    const { subject, html, text } = generateOtpEmail(otp, cleanIdentifier);
    await sendEmail({ to: cleanIdentifier, subject, html, text });
  }

  // Trigger SMS/WhatsApp Provider if identifier is a mobile number
  if (isMobileNum) {
    const provider = getSmsProvider();
    try {
      await provider.sendSms(
        cleanIdentifier,
        `Your OTP for AgnelArena is ${otp}. Valid for 10 minutes.`
      );
    } catch (smsErr) {
      console.error('[SMS] Failed to send SMS via provider:', smsErr);
    }
  }

  if (!isJson) {
    const response = NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(cleanIdentifier)}`, request.url), 303);
    response.cookies.set(GUEST_COOKIE, cleanIdentifier, getCookieOptions());
    return response;
  }

  return NextResponse.json({ success: true, message: 'OTP sent.' });
}