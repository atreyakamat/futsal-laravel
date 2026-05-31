import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { query, queryOne } from '@/lib/db';

const createTimingSchema = z.object({
  arena_id: z.number(),
  time_slot: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  day_of_week: z.number().optional(),
});

async function readSuperAdminId() {
  const cookieStore = await cookies();
  if (cookieStore.get('fg_auth_role')?.value !== 'super_admin') {
    return null;
  }
  const value = cookieStore.get('fg_auth_user')?.value;
  return value ? Number(value) : null;
}

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = createTimingSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Verify arena exists
    const arena = await queryOne(
      'SELECT id FROM arenas WHERE id = ?',
      [payload.arena_id]
    );

    if (!arena) {
      return NextResponse.json(
        { success: false, message: 'Arena not found' },
        { status: 404 }
      );
    }

    // Insert timing
    const result = await queryOne<{ id: number }>(
      `INSERT INTO slot_timings (arena_id, time_slot, start_time, end_time, day_of_week, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       RETURNING id`,
      [payload.arena_id, payload.time_slot, payload.start_time, payload.end_time, payload.day_of_week ?? null]
    );

    return NextResponse.json({
      success: true,
      message: 'Timing created successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Timing creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const arenaId = searchParams.get('arena_id');

    if (!arenaId) {
      return NextResponse.json(
        { success: false, message: 'arena_id parameter required' },
        { status: 400 }
      );
    }

    const timings = await query<{
      id: number;
      time_slot: string;
      start_time: string;
      end_time: string;
      day_of_week: number | null;
    }>(
      'SELECT id, time_slot, start_time, end_time, day_of_week FROM slot_timings WHERE arena_id = ? ORDER BY time_slot',
      [Number(arenaId)]
    );

    return NextResponse.json({
      success: true,
      data: timings,
    });
  } catch (error) {
    console.error('Fetch timings error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
