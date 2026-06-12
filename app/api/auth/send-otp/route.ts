import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeOtp } from '@/lib/domain';
import { GUEST_COOKIE, getCookieOptions } from '@/lib/session';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const otp = crypto.randomInt(100000, 999999).toString();

  await storeOtp(payload.identifier, otp);
  console.info(`[OTP] ${payload.identifier}: ${otp}`);

  if (!isJson) {
    const response = NextResponse.redirect(new URL(`/verify-otp?identifier=${encodeURIComponent(payload.identifier)}`, request.url));
    response.cookies.set(GUEST_COOKIE, payload.identifier, getCookieOptions());
    return response;
  }

  return NextResponse.json({ success: true, message: 'OTP generated.' });
}