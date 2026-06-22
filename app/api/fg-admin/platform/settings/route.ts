import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = {
      platformFee: 5.0,
      maintenanceMode: false,
      supportEmail: 'support@futsalgoa.com'
    };
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
