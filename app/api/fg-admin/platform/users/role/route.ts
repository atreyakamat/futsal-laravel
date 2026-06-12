import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clearSecurityPermissions, getAdminContext, setArenaAssignment, setSecurityPermissions } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
  role: z.enum(['super_admin', 'arena_admin', 'security', 'customer']),
  arena_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce.number().int().positive().optional().nullable()
  ),
  can_verify_ticket: z.coerce.boolean().optional().default(true),
  can_confirm_entry: z.coerce.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const raw = isJson ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const payload = bodySchema.parse({
    ...(raw as Record<string, unknown>),
    can_verify_ticket: isJson
      ? (raw as Record<string, unknown>).can_verify_ticket
      : ['on', 'true', '1'].includes(String((raw as Record<string, unknown>).can_verify_ticket ?? '')),
    can_confirm_entry: isJson
      ? (raw as Record<string, unknown>).can_confirm_entry
      : ['on', 'true', '1'].includes(String((raw as Record<string, unknown>).can_confirm_entry ?? '')),
  });
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  if ((payload.role === 'security' || payload.role === 'arena_admin') && !payload.arena_id) {
    return NextResponse.json({ success: false, message: 'Arena is required for scoped admin roles.' }, { status: 400 });
  }

  await setArenaAssignment(payload.user_id, payload.role, payload.arena_id ?? null);
  if (payload.role === 'security') {
    await setSecurityPermissions(payload.user_id, {
      canVerifyTicket: payload.can_verify_ticket,
      canConfirmEntry: payload.can_confirm_entry,
    });
  } else {
    await clearSecurityPermissions(payload.user_id);
  }

  if (!isJson) {
    return NextResponse.redirect(new URL('/fg-admin/platform/users?updated=1', request.url));
  }

  return NextResponse.json({ success: true });
}
