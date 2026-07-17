import fs from 'fs';
import path from 'path';
import { NextResponse, NextRequest } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const logPath = process.env.SMS_LOG_PATH || '/tmp/sms-log.txt';
    if (fs.existsSync(logPath)) {
      const data = fs.readFileSync(logPath, 'utf8');
      return NextResponse.json({ logs: data });
    }
    return NextResponse.json({ logs: 'No log file found' });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
