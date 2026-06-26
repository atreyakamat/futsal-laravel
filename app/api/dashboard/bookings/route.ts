import { NextResponse } from 'next/server';
import { getBookingsForUser } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';

export async function GET() {
  const userId = await readAuthUserId();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const bookings = await getBookingsForUser(userId);
  return NextResponse.json({ success: true, bookings });
}
