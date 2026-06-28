import { NextResponse } from 'next/server';
import { removeArenaAdmin, logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const arenaId = searchParams.get('arena_id');

    if (!arenaId) {
      return NextResponse.json(
        { success: false, message: 'arena_id parameter required' },
        { status: 400 }
      );
    }

    const result = await removeArenaAdmin(Number(arenaId), Number(params.id));

    // Log audit action
    await logAuditAction(
      superAdminId,
      'DELETE_ARENA_ADMIN',
      'arena_admin',
      result.id,
      { is_active: false },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Arena admin removed successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    console.error('Remove arena admin error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const adminId = Number(params.id);
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = updateSchema.parse(await request.json());

    const updates = [];
    const values = [];

    if (payload.name) {
      updates.push('name = ?');
      values.push(payload.name);
    }
    if (payload.email) {
      updates.push('email = ?');
      values.push(payload.email);
    }
    if (payload.password) {
      const hash = await bcrypt.hash(payload.password, 12);
      updates.push('password = ?');
      values.push(hash);
    }

    if (updates.length > 0) {
      values.push(adminId);
      await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    }

    const user = await queryOne<{ role: string }>('SELECT role FROM users WHERE id = ?', [adminId]);
    if (user) {
      const legacyUpdates = [];
      const legacyValues = [];
      
      if (payload.name) {
        const parts = payload.name.split(' ');
        legacyUpdates.push('first_name = ?', 'last_name = ?');
        legacyValues.push(parts[0], parts.slice(1).join(' ') || '');
      }
      if (payload.email) {
        legacyUpdates.push('email = ?');
        legacyValues.push(payload.email);
      }
      if (payload.password) {
        const hash = await bcrypt.hash(payload.password, 12);
        legacyUpdates.push('password_hash = ?');
        legacyValues.push(hash);
      }
      if (payload.is_active !== undefined) {
        legacyUpdates.push('is_active = ?');
        legacyValues.push(payload.is_active);
      }

      if (legacyUpdates.length > 0) {
        legacyValues.push(adminId);
        if (user.role === 'arena_admin') {
          await query(`UPDATE arena_admins SET ${legacyUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`, legacyValues);
        } else if (user.role === 'security') {
          await query(`UPDATE security_staff SET ${legacyUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`, legacyValues);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Admin updated successfully' });
  } catch (error) {
    console.error('Update admin error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
