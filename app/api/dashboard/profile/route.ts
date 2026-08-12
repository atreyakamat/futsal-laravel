import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone';

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  customer_mobile: z.string().min(5).max(15),
});

export async function GET() {
  const userId = await readAuthUserId();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
    data: user,
  });
}

export async function PUT(request: Request) {
  const userId = await readAuthUserId();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body && typeof body.customer_mobile === 'string') {
      body.customer_mobile = normalizePhoneNumber(body.customer_mobile);
    }
    if (body && typeof body.email === 'string') {
      body.email = body.email.trim().toLowerCase();
    }
    const payload = profileSchema.parse(body);

    const currentUser = await queryOne<{ id: number; role: string; email: string }>(
      'SELECT id, role, email FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const previousEmail = currentUser.email;
    const newEmail = payload.email;

    // Check unique email constraint if email is changing
    if (newEmail !== previousEmail.toLowerCase()) {
      const existingUser = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1',
        [newEmail, userId]
      );
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Email address is already in use by another account.' },
          { status: 400 }
        );
      }
    }

    // Persist email update in users table
    await query(
      'UPDATE users SET name = ?, email = ?, customer_mobile = ?, updated_at = NOW() WHERE id = ?',
      [payload.name, newEmail, payload.customer_mobile, userId]
    );

    // Sync role-specific profile tables to preserve session/identity integrity across roles
    if (currentUser.role === 'super_admin') {
      await query(
        'UPDATE super_admins SET email = ?, updated_at = NOW() WHERE user_id = ?',
        [newEmail, userId]
      );
    } else if (currentUser.role === 'arena_admin') {
      await query(
        'UPDATE arena_admins SET email = ?, updated_at = NOW() WHERE LOWER(email) = ?',
        [newEmail, previousEmail.toLowerCase()]
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
      data: {
        id: userId,
        name: payload.name,
        email: newEmail,
        customer_mobile: payload.customer_mobile,
        role: currentUser.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
