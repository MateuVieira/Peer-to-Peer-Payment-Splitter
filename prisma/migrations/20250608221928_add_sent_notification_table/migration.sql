/*
  Warnings:

  - You are about to drop the column `recipientEmail` on the `SentNotification` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId,eventType,recipient]` on the table `SentNotification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recipient` to the `SentNotification` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `SentNotification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SentNotificationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED_IDEMPOTENCY');

-- DropIndex
DROP INDEX "SentNotification_eventId_eventType_recipientEmail_key";

-- DropIndex
DROP INDEX "SentNotification_recipientEmail_idx";

-- AlterTable
ALTER TABLE "SentNotification" DROP COLUMN "recipientEmail",
ADD COLUMN     "recipient" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SentNotificationStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "SentNotification_recipient_idx" ON "SentNotification"("recipient");

-- CreateIndex
CREATE UNIQUE INDEX "SentNotification_eventId_eventType_recipient_key" ON "SentNotification"("eventId", "eventType", "recipient");
