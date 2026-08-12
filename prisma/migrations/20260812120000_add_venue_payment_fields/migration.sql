-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "venue_payment_status" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "venue_payment_reference" TEXT,
ADD COLUMN     "venue_payment_collected_by" INTEGER,
ADD COLUMN     "venue_payment_collected_at" TIMESTAMP(3);
