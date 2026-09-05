import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId, readAuthRole, readAuthChannel } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone';
import { isPlaceholderEmail } from '@/lib/domain';

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  customer_mobile: z.string().min(5).max(15).optional().or(z.literal('')),
});

export async function GET() {
  const userId = await readAuthUserId();
  const role = await readAuthRole();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // Which contact field (if any) the customer's current session verified via
  // OTP at login — that field is locked for editing here, same as checkout.
  // `null` for a session that predates the fg_auth_channel cookie.
  const authChannel = await readAuthChannel();

  if (role === 'super_admin') {
    const admin = await queryOne<{ id: number; email: string; first_name: string; last_name: string }>(
      'SELECT id, email, first_name, last_name FROM super_admins WHERE id = ? OR user_id = ? LIMIT 1',
      [userId, userId]
    );
    if (!admin) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Super Admin',
        email: admin.email,
        customer_mobile: '',
        role: 'super_admin',
        authChannel,
      },
    });
  }

  const user = await queryOne<{
    id: number;
    name: string;
    email: string;
    customer_mobile: string | null;
    role: string;
  }>(
    'SELECT id, name, email, customer_mobile, role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { ...user, email: isPlaceholderEmail(user.email) ? '' : user.email, authChannel },
  });
}

export async function PUT(request: Request) {
  const userId = await readAuthUserId();
  const role = await readAuthRole();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body && typeof body.customer_mobile === 'string') {
      body.customer_mobile = normalizePhoneNumber(body.customer_mobile) || '';
    }
    if (body && typeof body.email === 'string') {
      body.email = body.email.trim().toLowerCase();
    }
    const payload = profileSchema.parse(body);
    const newEmail = payload.email;
    // Defense in depth: the UI already renders the OTP-verified field
    // read-only, but a direct API call must not be able to change it either.
    const authChannel = await readAuthChannel();

    if (role === 'super_admin') {
      const admin = await queryOne<{ id: number; user_id: number | null; email: string }>(
        'SELECT id, user_id, email FROM super_admins WHERE id = ? OR user_id = ? LIMIT 1',
        [userId, userId]
      );
      if (!admin) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

      if (authChannel === 'email' && newEmail !== admin.email.toLowerCase()) {
        return NextResponse.json({ success: false, message: 'This email was verified via OTP login and cannot be changed.' }, { status: 400 });
      }

      const previousEmail = admin.email;
      if (newEmail !== previousEmail.toLowerCase()) {
        const existing = await queryOne<{ id: number }>(
          'SELECT id FROM super_admins WHERE LOWER(email) = ? AND id != ? LIMIT 1',
          [newEmail, admin.id]
        );
        if (existing) {
          return NextResponse.json({ success: false, message: 'Email address is already in use by another account.' }, { status: 400 });
        }
      }

      const names = payload.name.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      await query(
        'UPDATE super_admins SET email = ?, first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?',
        [newEmail, firstName, lastName, admin.id]
      );

      if (admin.user_id) {
        await query(
          'UPDATE users SET name = ?, email = ?, customer_mobile = ?, updated_at = NOW() WHERE id = ?',
          [payload.name, newEmail, payload.customer_mobile, admin.user_id]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        data: { id: userId, name: payload.name, email: newEmail, customer_mobile: payload.customer_mobile, role: 'super_admin' },
      });
    }

    const currentUser = await queryOne<{ id: number; role: string; email: string; customer_mobile: string | null }>(
      'SELECT id, role, email, customer_mobile FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (authChannel === 'email' && newEmail !== currentUser.email.toLowerCase()) {
      return NextResponse.json({ success: false, message: 'This email was verified via OTP login and cannot be changed.' }, { status: 400 });
    }
    if (authChannel === 'mobile' && payload.customer_mobile !== (currentUser.customer_mobile || '')) {
      return NextResponse.json({ success: false, message: 'This mobile number was verified via OTP login and cannot be changed.' }, { status: 400 });
    }

    const previousEmail = currentUser.email;

    if (newEmail !== previousEmail.toLowerCase()) {
      const existingUser = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1',
        [newEmail, userId]
      );
      if (existingUser) {
        return NextResponse.json({ success: false, message: 'Email address is already in use by another account.' }, { status: 400 });
      }
    }

    await query(
      'UPDATE users SET name = ?, email = ?, customer_mobile = ?, updated_at = NOW() WHERE id = ?',
      [payload.name, newEmail, payload.customer_mobile, userId]
    );

    if (currentUser.role === 'manager' || currentUser.role === 'arena_admin') {
      // Manager (per-turf) and arena_admin (platform-wide) are both rows in
      // the same arena_admins table.
      const names = payload.name.split(' ');
      await query(
        'UPDATE arena_admins SET email = ?, first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ? OR LOWER(email) = ?',
        [newEmail, names[0] || '', names.slice(1).join(' ') || '', userId, previousEmail.toLowerCase()]
      );
    } else if (currentUser.role === 'security') {
      await query(
        'UPDATE security_staff SET email = ?, updated_at = NOW() WHERE LOWER(email) = ?',
        [newEmail, previousEmail.toLowerCase()]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { id: userId, name: payload.name, email: newEmail, customer_mobile: payload.customer_mobile, role: currentUser.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
