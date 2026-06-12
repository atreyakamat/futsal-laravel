import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSecurityStaff, getSecurityStaff, removeSecurityStaff, logAuditAction } from '@/lib/super-admin';
import { queryOne } from '@/lib/db';
import { readSuperAdminId } from '@/lib/session';

const createStaffSchema = z.object({
  arena_id: z.coerce.number(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

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
    const payload = createStaffSchema.parse(
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

    const result = await createSecurityStaff(
      payload.arena_id,
      payload.name,
      payload.email,
      payload.phone,
      payload.permissions || ['check_in', 'check_out'],
      superAdminId
    );

    // Log audit action
    await logAuditAction(
      superAdminId,
      'CREATE_SECURITY_STAFF',
      'security_staff',
      result.staff.id,
      { email: result.staff.email, arena_id: payload.arena_id },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Security staff created successfully',
      data: {
        staff: result.staff,
        credentials: result.credential,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    console.error('Security staff creation error:', error);
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

    const staff = await getSecurityStaff(Number(arenaId));

    return NextResponse.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('Fetch security staff error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
