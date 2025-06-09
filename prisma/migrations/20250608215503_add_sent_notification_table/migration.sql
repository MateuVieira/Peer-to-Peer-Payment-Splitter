-- CreateTable
CREATE TABLE "SentNotification" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentNotification_eventId_idx" ON "SentNotification"("eventId");

-- CreateIndex
CREATE INDEX "SentNotification_recipientEmail_idx" ON "SentNotification"("recipientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SentNotification_eventId_eventType_recipientEmail_key" ON "SentNotification"("eventId", "eventType", "recipientEmail");
