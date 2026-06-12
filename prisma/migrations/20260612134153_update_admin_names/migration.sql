/*
  Warnings:

  - You are about to drop the column `name` on the `arena_admins` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `security_staff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "arena_admins" DROP COLUMN "name",
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;

-- AlterTable
ALTER TABLE "security_staff" DROP COLUMN "name",
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;

-- AlterTable
ALTER TABLE "super_admins" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;
