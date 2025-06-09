/*
  Warnings:

  - You are about to drop the column `sesMessageId` on the `SentNotification` table. All the data in the column will be lost.
  - Added the required column `notificationMessageId` to the `SentNotification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SentNotification" DROP COLUMN "sesMessageId",
ADD COLUMN     "notificationMessageId" TEXT NOT NULL;
