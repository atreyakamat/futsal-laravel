export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import { requireSuperAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const admin = await requireSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const logs = fs.readFileSync('/tmp/sms-log.txt', 'utf8');
    return new NextResponse(logs, { headers: { 'Content-Type': 'text/plain' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
