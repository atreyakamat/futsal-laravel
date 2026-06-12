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

  await query(
    `INSERT INTO arenas (name, slug, address, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [payload.name, payload.slug, payload.address ?? null, payload.status]
  );

  await createAdminAuditLog({
    action: 'arena_created',
    actorUserId: context.id,
    entityType: 'arena',
    entityId: payload.slug,
    afterData: payload,
  });

  if (!isJson) {
    return NextResponse.redirect(new URL('/fg-admin/platform/arenas?created=1', request.url));
  }

  return NextResponse.json({ success: true, message: 'Arena created successfully' });
}
