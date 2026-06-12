import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { query, queryOne } from '@/lib/db';
import { unsignValue } from '@/lib/session';

const requestApprovalSchema = z.object({
  date: z.string(),
  time_slot: z.string(),
  number_of_rounds: z.number().min(1).max(3),
  reason: z.string().optional(),
});

async function readArenaAdminContext() {
  const cookieStore = await cookies();
  const role = await unsignValue(cookieStore.get('fg_auth_role')?.value ?? null);
  
  if (role !== 'arena_admin') {
    return null;
  }

  const adminId = await unsignValue(cookieStore.get('fg_auth_user')?.value ?? null);
  const arenaId = await unsignValue(cookieStore.get('fg_arena_id')?.value ?? null);

  if (!adminId || !arenaId) {
    return null;
  }

  return {
    adminId: Number(adminId),
    arenaId: Number(arenaId),
  };
}

export async function POST(request: Request) {
  try {
    const context = await readArenaAdminContext();

    if (!context) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = requestApprovalSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Create free booking approval request
    const approval = await queryOne<{ id: number }>(
      `INSERT INTO admin_free_bookings (arena_admin_id, arena_id, booking_date, time_slot, number_of_rounds, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())
       RETURNING id`,
      [context.adminId, context.arenaId, payload.date, payload.time_slot, payload.number_of_rounds]
    );

    return NextResponse.json({
      success: true,
      message: 'Approval request submitted successfully',
      data: approval,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Approval request creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const context = await readArenaAdminContext();

    if (!context) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause = ['arena_admin_id = ?'];
    const params: Array<string | number> = [context.adminId];

    if (status) {
      whereClause.push('status = ?');
      params.push(status);
    }

    const approvals = await query<{
      id: number;
      booking_date: string;
      time_slot: string;
      number_of_rounds: number;
      status: string;
    }>(
      `SELECT id, booking_date, time_slot, number_of_rounds, status
       FROM admin_free_bookings
       WHERE ${whereClause.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    );

    return NextResponse.json({
      success: true,
      data: approvals,
    });
  } catch (error) {
    console.error('Fetch approval requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
