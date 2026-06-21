import { NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await readAuthUserId();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context || context.role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Get notifications for this arena admin
    const notifications = await query<{
      id: number;
      title: string;
      message: string;
      request_type: string | null;
      status: string | null;
      is_read: boolean;
      created_at: string;
    }>(
      `SELECT id, title, message, request_type, status, is_read, created_at
         FROM notifications
        WHERE user_id = ? AND role = ?
     ORDER BY created_at DESC LIMIT 50`,
      [userId, 'arena_admin']
    );

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Arena notifications error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const userId = await readAuthUserId();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context || context.role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Mark notifications as read for this arena admin
    await query(
      `UPDATE notifications
         SET is_read = TRUE
       WHERE user_id = ? AND role = ? AND is_read = FALSE`,
      [userId, 'arena_admin']
    );

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}