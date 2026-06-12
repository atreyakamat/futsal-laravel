import { NextResponse } from 'next/server';
import { z } from 'zod';
import { removeOtp, findUserByIdentifier, verifyOtp as verifyOtpHash, query, queryOne } from '@/lib/domain';
import { AUTH_COOKIE, signValue, getCookieOptions } from '@/lib/session';

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

  if (!user || user?.length === 0 || !user[0]) {
    return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
  }

  if (!['super_admin', 'arena_admin', 'security'].includes(user[0].role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  await removeOtp(payload.identifier);

  const response = NextResponse.json({ success: true, userExists: true, role: user[0].role });
  
  const signedUserId = signValue(String(user[0].id));
  const signedRole = signValue(user[0].role);
  const cookieOpts = getCookieOptions();

  response.cookies.set(AUTH_COOKIE, signedUserId, cookieOpts);
  response.cookies.set('fg_auth_role', signedRole, cookieOpts);

  if (user[0].role === 'arena_admin' || user[0].role === 'security') {
    const manager = await queryOne<{ arena_id: number }>(
      'SELECT arena_id FROM arena_managers WHERE user_id = ? LIMIT 1',
      [user[0].id]
    );
    if (manager?.arena_id) {
      response.cookies.set('fg_arena_id', signValue(String(manager.arena_id)), cookieOpts);
    }
  }

  return response;
}

