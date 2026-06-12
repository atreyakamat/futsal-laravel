import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { query, queryOne } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { unsignValue } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = unsignValue(cookieStore.get('fg_auth_user')?.value ?? null);
    const role = unsignValue(cookieStore.get('fg_auth_role')?.value ?? null);
    const arenaId = unsignValue(cookieStore.get('fg_arena_id')?.value ?? null);

    if (!userId || role !== 'arena_admin' || !arenaId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = await queryOne<{
      id: number;
      email: string;
      arena_id: number;
      first_name: string | null;
      last_name: string | null;
    }>(
      'SELECT id, email, arena_id, first_name, last_name FROM arena_admins WHERE id = ? AND is_active = true',
      [parseInt(userId)]
    );

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        arena_id: admin.arena_id,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: 'arena_admin',
      },
    });
  } catch (error) {
    console.error('Arena admin settings GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = unsignValue(cookieStore.get('fg_auth_user')?.value ?? null);
    const role = unsignValue(cookieStore.get('fg_auth_role')?.value ?? null);

    if (!userId || role !== 'arena_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const admin = await queryOne<{ id: number; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM arena_admins WHERE id = ? AND is_active = true',
      [parseInt(userId)]
    );

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in arena_admins
    await query(
      'UPDATE arena_admins SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, admin.id]
    );

    // Update password in users
    await query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?',
      [hashedPassword, admin.email]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Arena admin settings PUT error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

