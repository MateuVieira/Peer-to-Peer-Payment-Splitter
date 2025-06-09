import { SESService } from "../../../core/lib/aws/ses.service.js";
import {
  type ISentNotificationLogRepository,
  SentNotificationStatus,
} from "../domain/sentNotification.types.js";
import { logger } from "../../../core/logger.js";

export interface NotificationRequestParams {
  eventId: string;
  eventType: string;
  recipientEmail: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

export class NotificationService {
  constructor(
    private sesService: SESService,
    private notificationLogRepository: ISentNotificationLogRepository
  ) {}

  private async shouldSendEmail(
    eventId: string,
    eventType: string,
    recipientEmail: string
  ): Promise<boolean> {
    const existingNotification = await this.notificationLogRepository.findByEventDetails({
      eventId,
      eventType,
      recipient: recipientEmail,
    });

    return !existingNotification;
  }

  private async recordNotification(
    eventId: string,
    eventType: string,
    recipientEmail: string,
    subject: string,
    status: SentNotificationStatus,
    notificationMessageId: string
  ): Promise<void> {
    try {
      await this.notificationLogRepository.create({
        eventId,
        eventType,
        recipient: recipientEmail,
        subject,
        status,
        notificationMessageId,
      });
    } catch (error) {
      logger.error(
        { error, eventId, eventType, recipientEmail },
        "Failed to record notification log"
      );
    }
  }

  public async requestNotification(params: NotificationRequestParams): Promise<void> {
    const { eventId, eventType, recipientEmail, subject, body, htmlBody } = params;

    logger.info({ eventId, eventType, recipientEmail }, "Processing notification request");

    const shouldSendEmail = await this.shouldSendEmail(eventId, eventType, recipientEmail);

    if (!shouldSendEmail) {
      return;
    }

    try {
      const notificationId = await this.sesService.sendEmail({
        toAddresses: recipientEmail,
        subject,
        body,
        htmlBody,
      });

      if (!notificationId) {
        throw new Error("Failed to send notification email via SES");
      }

      await this.recordNotification(
        eventId,
        eventType,
        recipientEmail,
        subject,
        SentNotificationStatus.SUCCESS,
        notificationId
      );
      logger.info(
        { eventId, eventType, recipientEmail, notificationId },
        "Notification email sent successfully"
      );
    } catch (emailError) {
      logger.error(
        { emailError, eventId, eventType, recipientEmail },
        "Failed to send notification email via SES"
      );

      throw emailError;
    }
  }
}
