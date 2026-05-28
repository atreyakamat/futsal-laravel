import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOtp, findUserByIdentifier, verifyOtp as verifyOtpHash, query } from '@/lib/domain';
import { AUTH_COOKIE } from '@/lib/session';

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
    return NextResponse.json({ success: false, message: 'Invalid or expired OTP.' }, { status: 400 });
  }

  const user = await query<{ id: number; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE (email = ? OR customer_mobile = ?) LIMIT 1',
    [payload.identifier, payload.identifier]
  );

  if (user.length === 0) {
    return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
  }

  if (!['admin', 'super_admin', 'arena_admin', 'security'].includes(user[0].role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  await removeOtp(payload.identifier);

  const response = NextResponse.json({ success: true, userExists: true, role: user[0].role });
  response.cookies.set(AUTH_COOKIE, String(user[0].id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
