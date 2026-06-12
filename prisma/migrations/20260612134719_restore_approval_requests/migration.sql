-- CreateTable
CREATE TABLE "approval_requests" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "request_type" TEXT NOT NULL DEFAULT 'slot_template_update',
    "arena_id" INTEGER,
    "requested_by" INTEGER,
    "payload_json" TEXT,
    "decision_by" INTEGER,
    "decision_reason" TEXT,
    "decision_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_arena_id_idx" ON "approval_requests"("arena_id");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_requested_by_idx" ON "approval_requests"("requested_by");
