import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';
import { query } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Mock reports for now until fully implemented
    const reports = [
      { id: 1, type: 'Financial', status: 'Generated', date: new Date().toISOString() },
      { id: 2, type: 'Bookings', status: 'Pending', date: new Date().toISOString() }
    ];
    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
