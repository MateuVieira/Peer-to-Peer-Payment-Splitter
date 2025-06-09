import type { Message as SQSMessage } from "@aws-sdk/client-sqs";
import { IMessageHandler } from "../../../core/events/message-handler.interface.js";
import { Topic } from "../../../core/events/topics.js";
import {
  CsvProcessingStartedPayload,
  CsvProcessingStartedPayloadSchema,
} from "../domain/csv-event-payloads.js";
import { CsvService } from "../application/csv.service.js";
import { logger } from "../../../core/logger.js";

export class CsvProcessingStartedHandler implements IMessageHandler<CsvProcessingStartedPayload> {
  readonly topic = Topic.CSV_PROCESSING_STARTED;
  readonly payloadSchema = CsvProcessingStartedPayloadSchema;
  readonly prefix = "[CsvProcessingStartedHandler]";

  constructor(private readonly csvService: CsvService) {}

  async handle(payload: CsvProcessingStartedPayload, originalMessage: SQSMessage): Promise<void> {
    const startTime = process.hrtime.bigint();
    logger.info(
      `${this.prefix} Received ${this.topic} event for csvProcessingId: ${payload.jobId}, Message ID: ${originalMessage.MessageId}`,
      { payload }
    );

    try {
      await this.csvService.processFileFromEvent(payload);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      logger.info(
        `${this.prefix} Successfully sent notification for csvProcessingId: ${payload.jobId}. Duration: ${durationMs.toFixed(2)}ms`
      );
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      logger.error(
        `${this.prefix} Error sending notification for csvProcessingId: ${payload.jobId}. Duration: ${durationMs.toFixed(2)}ms:`,
        { error, payload, messageId: originalMessage.MessageId }
      );

      throw error;
    }
  }
}
