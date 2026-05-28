import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminContext, setArenaAssignment } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
  role: z.enum(['super_admin', 'admin', 'arena_admin', 'security', 'customer']),
  arena_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce.number().int().positive().optional().nullable()
  ),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const payload = bodySchema.parse(
    isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
  );
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  if ((payload.role === 'arena_admin' || payload.role === 'security') && !payload.arena_id) {
    return NextResponse.json({ success: false, message: 'Arena is required for scoped admin roles.' }, { status: 400 });
  }

  await setArenaAssignment(payload.user_id, payload.role, payload.arena_id ?? null);

  if (!isJson) {
    return NextResponse.redirect(new URL('/admin/users?updated=1', request.url));
  }

  return NextResponse.json({ success: true });
}
