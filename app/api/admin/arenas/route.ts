import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readAuthUserId } from '@/lib/session';

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  
  const user = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  
  return user.length > 0 && (user[0].role === 'admin' || user[0].role === 'super_admin');
}

export async function POST(req: Request) {
  try {
    const userId = await readAuthUserId();
    
    if (!(await isAdmin(userId))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    // Re-using validation schema here or creating a centralized one is recommended
    
    await query(
      `INSERT INTO arenas (name, slug, address, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [body.name, body.slug, body.address || null, body.status || 'active']
    );

    return NextResponse.json({ success: true, message: 'Arena created successfully' });
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Failed to create arena' }, { status: 400 });
  }
}
