import { PrismaClient } from "../../../generated/prisma/index.js";
import { logger } from "../../../core/logger.js";

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
      const prismaNotification = await this.prisma.sentNotification.findUnique({
        where: {
          eventId_eventType_recipient: {
            eventId: params.eventId,
            eventType: params.eventType,
            recipient: params.recipient,
          },
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
      const prismaCreateData = data;

      await this.prisma.sentNotification.create({
        data: prismaCreateData,
      });
    } catch (error) {
      logger.error("Error in PrismaNotificationLogRepository.create:", error);
      throw error;
    }
  }
}
