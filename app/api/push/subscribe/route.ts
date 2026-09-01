import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId, readAuthRole } from '@/lib/session';
import { queryOne } from '@/lib/domain';
import { saveSubscription, type PushOwnerType } from '@/lib/push';
import { verifyCsrfMiddleware } from '@/lib/csrf-middleware';

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * Resolves the logged-in identity that a subscription should be filed
 * under. Mirrors lib/admin.ts's getAdminContext role→table split (admin
 * identities aren't rows in `users`) without needing that function's full
 * arena-scoping resolution — push delivery only cares who to notify, not
 * which turf they're currently operating. security/accountant roles are
 * deliberately out of scope for booking push alerts, so they resolve to
 * null (no subscription saved) rather than being silently mapped to the
 * wrong owner table.
 */
async function resolvePushOwner(): Promise<{ type: PushOwnerType; id: number } | null> {
  const userId = await readAuthUserId();
  if (!userId) return null;
  const role = await readAuthRole();

  if (!role || role === 'customer') {
    return { type: 'user', id: userId };
  }

  if (role === 'super_admin') {
    const row = await queryOne<{ id: number }>(
      'SELECT id FROM super_admins WHERE (user_id = ? OR id = ?) AND is_active = true LIMIT 1',
      [userId, userId]
    );
    return row ? { type: 'super_admin', id: row.id } : null;
  }

  if (role === 'manager' || role === 'arena_admin') {
    const row = await queryOne<{ id: number }>(
      'SELECT id FROM arena_admins WHERE id = ? AND is_active = true LIMIT 1',
      [userId]
    );
    return row ? { type: 'arena_admin', id: row.id } : null;
  }

  return null;
}

export async function POST(request: Request) {
  const csrfError = await verifyCsrfMiddleware(request);
  if (csrfError) return csrfError;

  const owner = await resolvePushOwner();
  if (!owner) {
    return NextResponse.json({ success: false, message: 'Not logged in.' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid subscription payload.' }, { status: 400 });
  }

  await saveSubscription(owner.type, owner.id, parsed.data);

  return NextResponse.json({ success: true });
}
