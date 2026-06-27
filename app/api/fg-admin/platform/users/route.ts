import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';
import { query } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch users with their arena and role
    const users = await query(`
      SELECT u.id, u.name, u.email, u.customer_mobile, u.role,
             am.arena_id, a.name AS arena_name, am.role AS arena_role, u.created_at
      FROM users u
      LEFT JOIN arena_managers am ON am.user_id = u.id
      LEFT JOIN arenas a ON a.id = am.arena_id
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}