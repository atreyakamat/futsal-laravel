import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId, readAuthRole, readAuthChannel } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone';
import { isPlaceholderEmail, isPlaceholderName, updateCustomerProfile } from '@/lib/domain';

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
    data: {
      ...user,
      name: isPlaceholderName(user.name, user.email) ? '' : user.name,
      email: isPlaceholderEmail(user.email) ? '' : user.email,
      authChannel,
    },
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

    const result = await updateCustomerProfile(
      userId,
      { name: payload.name, email: newEmail, customer_mobile: payload.customer_mobile || '' },
      authChannel
    );

    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
