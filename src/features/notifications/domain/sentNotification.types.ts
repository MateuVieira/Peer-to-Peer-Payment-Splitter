export enum SentNotificationStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PENDING = "PENDING",
  SKIPPED_IDEMPOTENCY = "SKIPPED_IDEMPOTENCY",
}

export interface ISentNotificationLogRepository {
  findByEventDetails(params: {
    eventId: string;
    eventType: string;
    recipient: string;
  }): Promise<boolean>;

  create(data: {
    eventId: string;
    eventType: string;
    recipient: string;
    subject: string;
    status: SentNotificationStatus;
    notificationMessageId: string;
  }): Promise<void>;
}
