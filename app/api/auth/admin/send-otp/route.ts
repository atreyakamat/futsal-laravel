import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeOtp, query } from '@/lib/domain';
import { normalizePhoneNumber } from '@/lib/phone';

const bodySchema = z.object({
  identifier: z.string().min(3).max(100),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );

  const cleanIdentifier = payload.identifier.includes('@') 
    ? payload.identifier 
    : normalizePhoneNumber(payload.identifier);

  const user = await query<{ id: number; role: string }>(
    'SELECT id, role FROM users WHERE (email = ? OR customer_mobile = ?) LIMIT 1',
    [payload.identifier, cleanIdentifier]
  );

  if (!user || user?.length === 0 || !['super_admin', 'arena_admin', 'security'].includes(user[0].role)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized. Admin access required.' },
      { status: 403 }
    );
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  await storeOtp(cleanIdentifier, otp);
  console.info(`[ADMIN OTP] ${cleanIdentifier}: ${otp}`);

  return NextResponse.json({ success: true, message: 'OTP sent to admin.' });
}
