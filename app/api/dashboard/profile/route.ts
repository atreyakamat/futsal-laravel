import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone';

const profileSchema = z.object({
  name: z.string().min(2).max(100),
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
    const payload = profileSchema.parse(body);

    await query(
      'UPDATE users SET name = ?, customer_mobile = ?, updated_at = NOW() WHERE id = ?',
      [payload.name, payload.customer_mobile, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
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
