import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), 'public', 'sms-log.txt');
    if (fs.existsSync(logPath)) {
      const data = fs.readFileSync(logPath, 'utf8');
      return NextResponse.json({ logs: data });
    }
    return NextResponse.json({ logs: 'No log file found' });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
