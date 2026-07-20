import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeOtp } from '@/lib/domain';
import { GUEST_COOKIE, getCookieOptions } from '@/lib/session';
import { getBaseUrl } from '@/lib/session';
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
    const baseUrl = getBaseUrl(request);
    if (!isJson) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, baseUrl));
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

    const baseUrl = getBaseUrl(request);
    if (!isJson) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, baseUrl));
    }
    return NextResponse.json({ success: false, message: msg }, { status: 429 });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  await storeOtp(cleanIdentifier, otp);
  console.info(`[OTP] ${cleanIdentifier}: ${otp}`);

  // Trigger SMS/WhatsApp Provider if identifier is a mobile number
  if (isMobileNum) {
    const provider = getSmsProvider();
    try {
      const sent = await provider.sendSms(
        cleanIdentifier,
        `Your OTP for AgnelArena is ${otp}. Valid for 10 minutes.`
      );
      if (!sent) {
        console.error(`[SMS] Provider reported failure sending OTP to ${cleanIdentifier}`);
      }
    } catch (smsErr) {
      console.error('[SMS] Failed to send SMS via provider:', smsErr);
    }
    
    // Look up user to see if they have an email on file to send backup OTP
    try {
      const { findUserByIdentifier } = await import('@/lib/domain');
      const user = await findUserByIdentifier(cleanIdentifier);
      if (user && user.email) {
        const { subject, html, text } = generateOtpEmail(otp, user.email);
        await sendEmail({ to: user.email, subject, html, text });
      }
    } catch (err) {
      console.error('[OTP] Failed to send backup email:', err);
    }
  }


  if (!isJson) {
    const baseUrl = getBaseUrl(request);
    const response = NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(cleanIdentifier)}`, baseUrl), 303);
    response.cookies.set(GUEST_COOKIE, cleanIdentifier, getCookieOptions());
    return response;
  }

  return NextResponse.json({ success: true, message: 'OTP sent.' });
}