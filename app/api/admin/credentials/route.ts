import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAdminContext,
  isAdminRole,
  setArenaSecurityPasscode,
  updateUserPassword,
} from '@/lib/admin';
import { queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  current_password: z.string().optional().nullable(),
  new_password: z.string().optional().nullable(),
  arena_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce.number().int().positive().optional().nullable()
  ),
  security_passcode: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !isAdminRole(context.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  if (payload.new_password) {
    const user = await queryOne<{ password: string | null }>('SELECT password FROM users WHERE id = ? LIMIT 1', [context.id]);
    if (!user?.password || !payload.current_password) {
      return NextResponse.json({ success: false, message: 'Current password is required.' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(payload.current_password, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 400 });
    }

    await updateUserPassword(context.id, payload.new_password);
  }

  if (payload.security_passcode) {
    const canManageSecurityPasscode = context.role === 'super_admin' || context.role === 'arena_admin';
    if (!canManageSecurityPasscode) {
      return NextResponse.json({ success: false, message: 'Only super admins and arena admins can update arena security passcodes.' }, { status: 403 });
    }

    const arenaId = context.role === 'super_admin'
      ? payload.arena_id ?? null
      : context.arenaId ?? null;

    if (!arenaId) {
      return NextResponse.json({ success: false, message: 'Arena is required for security passcode updates.' }, { status: 400 });
    }

    await setArenaSecurityPasscode(arenaId, payload.security_passcode);
  }

  if (!isJson) {
    return NextResponse.redirect(new URL('/admin/credentials?updated=1', request.url));
  }

  return NextResponse.json({ success: true });
}
