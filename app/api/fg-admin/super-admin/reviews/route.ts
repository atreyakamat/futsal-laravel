import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/domain';
import { logAuditAction } from '@/lib/super-admin';

export async function GET(request: Request) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const reviews = await query<{
    id: number;
    arena_id: number;
    arena_name: string;
    user_id: number;
    customer_name: string;
    rating: number;
    comment: string | null;
    status: string;
    created_at: string;
  }>(
    `SELECT r.id, r.arena_id, a.name as arena_name, r.user_id, u.name as customer_name,
            r.rating, r.comment, r.status, r.created_at
       FROM arena_reviews r
       JOIN arenas a ON a.id = r.arena_id
       JOIN users u ON u.id = r.user_id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
      LIMIT 100`,
    [status]
  );

  return NextResponse.json({ success: true, data: reviews });
}

const decisionSchema = z.object({
  reviewId: z.number(),
  decision: z.enum(['approved', 'rejected']),
});

export async function PUT(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = decisionSchema.parse(await request.json());

    const updated = await query<{ id: number; arena_id: number }>(
      `UPDATE arena_reviews SET status = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ? RETURNING id, arena_id`,
      [payload.decision, superAdminId, payload.reviewId]
    );

    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    await logAuditAction(
      superAdminId,
      'REVIEW_MODERATED',
      'arena_review',
      payload.reviewId,
      { decision: payload.decision, arenaId: updated[0].arena_id },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: `Review ${payload.decision}.` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Review moderation error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reviewId = Number(searchParams.get('id'));
  if (!reviewId) {
    return NextResponse.json({ success: false, message: 'id parameter required' }, { status: 400 });
  }

  await query(`DELETE FROM arena_reviews WHERE id = ?`, [reviewId]);

  await logAuditAction(
    superAdminId,
    'REVIEW_DELETED',
    'arena_review',
    reviewId,
    {},
    request.headers.get('x-forwarded-for') || 'unknown',
    request.headers.get('user-agent') || 'unknown'
  );

  return NextResponse.json({ success: true, message: 'Review deleted' });
}
