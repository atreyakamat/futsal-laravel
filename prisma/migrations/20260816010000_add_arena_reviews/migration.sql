-- CreateTable
CREATE TABLE IF NOT EXISTS "arena_reviews" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "arena_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "arena_reviews_arena_id_user_id_key" ON "arena_reviews"("arena_id", "user_id");
CREATE INDEX IF NOT EXISTS "arena_reviews_arena_id_idx" ON "arena_reviews"("arena_id");
CREATE INDEX IF NOT EXISTS "arena_reviews_status_idx" ON "arena_reviews"("status");
