import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPlatformArenaAdmin, getPlatformArenaAdmins, removePlatformArenaAdmin, getAdminArenaAssignments, logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';

const createArenaAdminSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  // Which turfs this admin is scoped to: omit/[] = platform-wide (every
  // turf), [x] = scoped to exactly turf x, [x, y, …] = scoped to that set.
  arena_ids: z.array(z.number().int().positive()).optional(),
});

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = createArenaAdminSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const result = await createPlatformArenaAdmin(payload.name, payload.email, undefined, superAdminId, payload.password || undefined, payload.arena_ids || []);

    await logAuditAction(
      superAdminId,
      'CREATE_ARENA_ADMIN',
      'arena_admin',
      result.admin.id,
      { email: result.admin.email, arena_ids: payload.arena_ids || [] },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Arena admin created successfully',
      data: {
        admin: result.admin,
        credentials: result.credential,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error('Arena admin creation error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admins = await getPlatformArenaAdmins();
    const withAssignments = await Promise.all(
      admins.map(async (admin) => ({ ...admin, arena_ids: await getAdminArenaAssignments(admin.id) }))
    );
    return NextResponse.json({ success: true, data: withAssignments });
  } catch (error) {
    console.error('Fetch arena admins error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, message: 'id parameter required' }, { status: 400 });
    }

    await removePlatformArenaAdmin(id);

    await logAuditAction(
      superAdminId,
      'DEACTIVATE_ARENA_ADMIN',
      'arena_admin',
      id,
      {},
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Arena admin deactivated' });
  } catch (error) {
    console.error('Deactivate arena admin error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
