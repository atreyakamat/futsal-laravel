import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminContext, createAdminAuditLog } from '@/lib/admin';
import { query } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  address: z.string().max(255).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
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

  const result = await query<{ id: number }>(
    `INSERT INTO arenas (name, slug, address, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW()) RETURNING id`,
    [payload.name, payload.slug, payload.address ?? null, payload.status]
  );
  
  const newArenaId = result && result.length > 0 ? result[0].id : null;

  await createAdminAuditLog({
    action: 'arena_created',
    approvedBy: context.id,
    arenaId: newArenaId,
    newValue: payload,
  });

  if (!isJson) {
    return NextResponse.redirect(new URL('/fg-admin/platform/arenas?created=1', request.url));
  }

  return NextResponse.json({ success: true, message: 'Arena created successfully', arena_id: newArenaId });
}
