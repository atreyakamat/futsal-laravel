import { NextResponse } from 'next/server';
import { getActiveArenas } from '@/lib/domain';

export async function GET() {
  const arenas = await getActiveArenas();
  return NextResponse.json({ success: true, arenas });
}