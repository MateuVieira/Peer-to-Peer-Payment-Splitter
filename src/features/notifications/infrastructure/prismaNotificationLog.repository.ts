import { PrismaClient } from "../../../generated/prisma/index.js";
import { logger } from "@core/logger.js";

import {
  SentNotificationStatus,
  type ISentNotificationLogRepository,
} from "../domain/sentNotification.types.js";

export class PrismaNotificationLogRepository implements ISentNotificationLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEventDetails(params: {
    eventId: string;
    eventType: string;
    recipient: string;
  }): Promise<boolean> {
    try {
      const prismaNotification = await this.prisma.sentNotification.findFirst({
        where: {
          eventId: params.eventId,
          eventType: params.eventType,
          recipient: params.recipient,
        },
        select: { id: true },
      });

      return !!prismaNotification;
    } catch (error) {
      logger.error("Error in PrismaNotificationLogRepository.findByEventDetails:", error);
      throw error;
    }
  }

  async create(data: {
    eventId: string;
    eventType: string;
    recipient: string;
    subject: string;
    status: SentNotificationStatus;
    notificationMessageId: string;
  }): Promise<void> {
    try {
      await this.prisma.sentNotification.create({
        data: {
          eventId: data.eventId,
          eventType: data.eventType,
          recipient: data.recipient,
          subject: data.subject,
          status: data.status,
          notificationMessageId: data.notificationMessageId,
        },
      });

      logger.info(
        `Notification log created for event ${data.eventId} of type ${data.eventType} for recipient ${data.recipient}`
      );
    } catch (error) {
      logger.error(
        {
          error,
          data: JSON.stringify(data),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          errorName: error instanceof Error ? error.name : "Unknown error type",
        },
        "Error in PrismaNotificationLogRepository.create"
      );
      throw error;
    }
  }
}
