import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';
import { getNotifications } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await getNotifications(admin.id, 'super_admin');

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}