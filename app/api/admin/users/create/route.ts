import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminContext, createAdminAuditLog, setArenaAssignment } from '@/lib/admin';
import { query } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import bcrypt from 'bcryptjs';

const bodySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['super_admin', 'admin', 'arena_admin', 'security', 'customer']),
  arena_id: z.string().optional().transform(val => val ? Number(val) : null),
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

  // Check if user already exists
  const existing = await query<{ id: number }>('SELECT id FROM users WHERE email = ? LIMIT 1', [payload.email]);
  if (!existing || existing?.length > 0) {
    if (!isJson) {
      return NextResponse.redirect(new URL('/admin/users?error=exists', request.url));
    }
    return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);

  const newUsers = await query<{ id: number }>(
    `INSERT INTO users (name, email, password, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW()) RETURNING id`,
    [payload.name, payload.email, passwordHash, payload.role]
  );

  const newUserId = newUsers && newUsers?.length > 0 ? newUsers[0].id : null;

  if (!newUserId) {
    throw new Error('Failed to create user');
  }

  if (payload.role !== 'customer' && payload.arena_id) {
    await setArenaAssignment(newUserId, payload.role, payload.arena_id);
  }

  await createAdminAuditLog({
    action: 'user_created',
    actorUserId: context.id,
    entityType: 'user',
    entityId: newUserId,
    afterData: { name: payload.name, email: payload.email, role: payload.role, arena_id: payload.arena_id },
  });

  if (!isJson) {
    return NextResponse.redirect(new URL('/admin/users?created=1', request.url));
  }

  return NextResponse.json({ success: true, message: 'User created successfully', userId: newUserId });
}
