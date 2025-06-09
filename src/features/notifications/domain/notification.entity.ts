export interface NotificationSendPayload {
  [key: string]: unknown;
  eventId: string;
  eventType: string;
  recipientEmail: string;
  subject: string;
  body: string;
  htmlBody?: string;
}
