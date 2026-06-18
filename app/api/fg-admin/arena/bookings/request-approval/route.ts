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

    const { createApprovalRequest } = await import('@/lib/admin');

    // Generate slots array from time_slot (assuming it's a single slot for now, or comma separated)
    const slots = payload.time_slot.split(',').map(s => s.trim());

    const approval = await createApprovalRequest({
      arenaId: context.arenaId,
      requestedBy: context.adminId,
      requestType: 'FREE_BOOKING_REQUEST',
      payload: {
        bookingDate: payload.date,
        slots: slots,
        customerName: 'Free Booking Request',
        customerMobile: 'N/A'
      },
      notes: payload.reason || 'Free booking request'
    });

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

    const approvals = await query(
      `SELECT id, 
              payload_json, 
              status, 
              decision_reason as rejection_reason,
              created_at
         FROM approval_requests 
        WHERE request_type = 'FREE_BOOKING_REQUEST' AND ${whereClause.join(' AND ')}
        ORDER BY created_at DESC 
        LIMIT 50`,
      params
    );

    // Map payload_json back to expected format
    const mappedApprovals = approvals.map((a: any) => {
      const payload = a.payload_json ? JSON.parse(a.payload_json) : {};
      return {
        id: a.id,
        booking_date: payload.bookingDate || '',
        time_slot: payload.slots ? payload.slots.join(', ') : '',
        number_of_rounds: 1,
        status: a.status,
        rejection_reason: a.rejection_reason
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedApprovals,
    });
  } catch (error) {
    console.error('Fetch approval requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
