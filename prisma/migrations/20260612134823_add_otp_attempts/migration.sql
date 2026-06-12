-- CreateTable
CREATE TABLE "otp_attempts" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_attempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "otp_attempts_identifier_key" ON "otp_attempts"("identifier");
