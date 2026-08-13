-- CreateTable
CREATE TABLE "accountants" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accountants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accountants_email_key" ON "accountants"("email");

-- CreateIndex
CREATE INDEX "accountants_email_idx" ON "accountants"("email");

-- CreateIndex
CREATE INDEX "accountants_is_active_idx" ON "accountants"("is_active");
