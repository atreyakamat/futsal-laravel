import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { query, queryOne } from '@/lib/db';
import { unsignValue, signValue, getCookieOptions } from '@/lib/session';
import { getAdminArenaAssignments } from '@/lib/super-admin';

/**
 * Turf picker for a multi-turf arena_admin (scoped to 2+ turfs via
 * arena_managers) — GET lists their assigned turfs, POST commits a choice
 * and mints a 'manager'-shaped session for that turf (see lib/admin.ts's
 * getAdminContext, which validates the choice is still one of their
 * assignments on every subsequent request).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = await unsignValue(cookieStore.get('fg_auth_user')?.value ?? null);
    const role = await unsignValue(cookieStore.get('fg_auth_role')?.value ?? null);

    if (!userId || role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const adminId = Number(userId);
    const assignedArenaIds = await getAdminArenaAssignments(adminId);

    if (assignedArenaIds.length === 0) {
      // Platform-wide — nothing to pick, this admin doesn't need this page.
      return NextResponse.json({ success: true, data: { platformWide: true, arenas: [] } });
    }

    const arenas = await query<{ id: number; name: string; slug: string }>(
      `SELECT id, name, slug FROM arenas WHERE id = ANY(?) ORDER BY name`,
      [assignedArenaIds]
    );

    return NextResponse.json({ success: true, data: { platformWide: false, arenas } });
  } catch (error) {
    console.error('Select-arena GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

const selectSchema = z.object({ arena_id: z.number().int().positive() });

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = await unsignValue(cookieStore.get('fg_auth_user')?.value ?? null);
    const role = await unsignValue(cookieStore.get('fg_auth_role')?.value ?? null);

    if (!userId || role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const adminId = Number(userId);
    const payload = selectSchema.parse(await request.json());

    const assignedArenaIds = await getAdminArenaAssignments(adminId);
    if (!assignedArenaIds.includes(payload.arena_id)) {
      return NextResponse.json({ success: false, message: 'You are not assigned to this turf' }, { status: 403 });
    }

    const admin = await queryOne<{ is_active: boolean }>('SELECT is_active FROM arena_admins WHERE id = ?', [adminId]);
    if (!admin || !admin.is_active) {
      return NextResponse.json({ success: false, message: 'Account inactive' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true, message: 'Turf selected' });
    const cookieOpts = getCookieOptions(60 * 60 * 24 * 7);
    response.cookies.set('fg_auth_role', await signValue('manager'), cookieOpts);
    response.cookies.set('fg_arena_id', await signValue(`${payload.arena_id}`), cookieOpts);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Select-arena POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
