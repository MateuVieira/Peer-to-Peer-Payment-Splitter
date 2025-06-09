import type { Message as SQSMessage } from "@aws-sdk/client-sqs";
import { IMessageHandler } from "../../../core/events/message-handler.interface.js";
import { Topic } from "../../../core/events/topics.js";
import { logger } from "../../../core/logger.js";
import { NotificationService } from "../application/notification.service.js";
import { NotificationSendPayload } from "../domain/notification.entity.js";

export class NotificationSendHandler implements IMessageHandler<NotificationSendPayload> {
  readonly topic = Topic.NOTIFICATION_SEND;
  readonly prefix = "[NotificationSendHandler]";

  constructor(private readonly notificationService: NotificationService) {}

  async handle(payload: NotificationSendPayload, originalMessage: SQSMessage): Promise<void> {
    logger.info(
      `${this.prefix} Received ${this.topic} event for eventId: ${payload.eventId}, eventType: ${payload.eventType}, Message ID: ${originalMessage.MessageId}`,
      { payload }
    );

    try {
      await this.notificationService.requestNotification(payload);
      logger.info(
        `${this.prefix} Successfully initiated processing for eventId: ${payload.eventId}, eventType: ${payload.eventType}`
      );
    } catch (error) {
      logger.error(
        `${this.prefix} Error processing ${this.topic} for eventId: ${payload.eventId}, eventType: ${payload.eventType}:`,
        { error, payload, messageId: originalMessage.MessageId }
      );

      throw error;
    }
  }
}
