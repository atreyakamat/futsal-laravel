import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { getApprovedReviews, getReviewAggregate, canUserReviewArena, upsertReview } from '@/lib/reviews';

const submitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const arenaId = Number(params.id);
  if (!arenaId) {
    return NextResponse.json({ success: false, message: 'Invalid arena id' }, { status: 400 });
  }

  const [aggregate, reviews] = await Promise.all([
    getReviewAggregate(arenaId),
    getApprovedReviews(arenaId),
  ]);

  return NextResponse.json({ success: true, data: { aggregate, reviews } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await readAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Please log in to leave a review.' }, { status: 401 });
    }

    const params = await context.params;
    const arenaId = Number(params.id);
    if (!arenaId) {
      return NextResponse.json({ success: false, message: 'Invalid arena id' }, { status: 400 });
    }

    const eligible = await canUserReviewArena(userId, arenaId);
    if (!eligible) {
      return NextResponse.json(
        { success: false, message: 'Only customers with a confirmed booking at this turf can leave a review.' },
        { status: 403 }
      );
    }

    const payload = submitSchema.parse(await request.json());
    await upsertReview({
      arenaId,
      userId,
      rating: payload.rating,
      comment: payload.comment?.trim() || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Thanks! Your review has been submitted and will appear once approved.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Review submission error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
