import { query, queryOne } from '@/lib/db';

export interface ReviewRow {
  id: number;
  arena_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
  customer_name?: string;
}

export interface ReviewAggregate {
  average: number;
  count: number;
}

export async function getReviewAggregate(arenaId: number): Promise<ReviewAggregate> {
  const row = await queryOne<{ avg_rating: string | null; review_count: string }>(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
       FROM arena_reviews
      WHERE arena_id = ? AND status = 'approved'`,
    [arenaId]
  );
  return {
    average: row?.avg_rating ? Number(row.avg_rating) : 0,
    count: row?.review_count ? Number(row.review_count) : 0,
  };
}

export async function getApprovedReviews(arenaId: number, limit = 20): Promise<ReviewRow[]> {
  return query<ReviewRow>(
    `SELECT r.id, r.arena_id, r.user_id, r.rating, r.comment, r.status, r.created_at, u.name as customer_name
       FROM arena_reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.arena_id = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT ?`,
    [arenaId, limit]
  );
}

/** Only customers with at least one confirmed booking at this arena may review it. */
export async function canUserReviewArena(userId: number, arenaId: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM bookings WHERE user_id = ? AND arena_id = ? AND payment_status = 'confirmed' LIMIT 1`,
    [userId, arenaId]
  );
  return !!row;
}

export async function getUserReviewForArena(userId: number, arenaId: number): Promise<ReviewRow | null> {
  return queryOne<ReviewRow>(
    `SELECT id, arena_id, user_id, rating, comment, status, created_at FROM arena_reviews WHERE arena_id = ? AND user_id = ? LIMIT 1`,
    [arenaId, userId]
  );
}

/** Creates or updates the user's review for this arena. Resubmitting an
 * existing review resets it to pending — it needs re-moderation, since the
 * content changed. */
export async function upsertReview(params: {
  arenaId: number;
  userId: number;
  rating: number;
  comment: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO arena_reviews (arena_id, user_id, rating, comment, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
     ON CONFLICT (arena_id, user_id) DO UPDATE SET
       rating = EXCLUDED.rating,
       comment = EXCLUDED.comment,
       status = 'pending',
       reviewed_by = NULL,
       reviewed_at = NULL,
       updated_at = NOW()`,
    [params.arenaId, params.userId, params.rating, params.comment]
  );
}
