import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getPendingApprovalRequests, approveApprovalRequest, rejectApprovalRequest, logAuditAction } from '@/lib/super-admin';

const approveSchema = z.object({
  request_id: z.number(),
});

const rejectSchema = z.object({
  request_id: z.number(),
  reason: z.string().min(1),
});

async function readSuperAdminId() {
  const cookieStore = await cookies();
  if (cookieStore.get('fg_auth_role')?.value !== 'super_admin') {
    return null;
  }
  const value = cookieStore.get('fg_auth_user')?.value;
  return value ? Number(value) : null;
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

    const requests = await getPendingApprovalRequests(arenaId ? Number(arenaId) : undefined);

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Fetch approval requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
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
    const body = isJson ? await request.json() : Object.fromEntries((await request.formData()).entries());

    const action = body.action;

    if (action === 'approve') {
      const payload = approveSchema.parse(body);
      const result = await approveApprovalRequest(payload.request_id, superAdminId);

      // Log audit action
      await logAuditAction(
        superAdminId,
        'APPROVE_SLOT_REQUEST',
        'slot_approval_request',
        payload.request_id,
        { status: 'approved' },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );

      return NextResponse.json({
        success: true,
        message: 'Approval request approved',
        data: result,
      });
    } else if (action === 'reject') {
      const payload = rejectSchema.parse(body);
      const result = await rejectApprovalRequest(payload.request_id, payload.reason);

      // Log audit action
      await logAuditAction(
        superAdminId,
        'REJECT_SLOT_REQUEST',
        'slot_approval_request',
        payload.request_id,
        { status: 'rejected', reason: payload.reason },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );

      return NextResponse.json({
        success: true,
        message: 'Approval request rejected',
        data: result,
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Approval action error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
