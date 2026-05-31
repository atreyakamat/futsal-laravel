import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const arenaId = cookieStore.get('fg_arena_id')?.value;
    const role = cookieStore.get('fg_auth_role')?.value;

    if (!arenaId || role !== 'arena_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const arena = await queryOne<{
      id: number;
      name: string;
      slug: string;
      address: string | null;
      description: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT id, name, slug, address, description, contact_email, contact_phone, status, created_at, updated_at FROM arenas WHERE id = ? AND status = ?',
      [parseInt(arenaId), 'active']
    );

    if (!arena) {
      return NextResponse.json(
        { success: false, message: 'Arena not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: arena,
    });
  } catch (error) {
    console.error('Fetch arena error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
