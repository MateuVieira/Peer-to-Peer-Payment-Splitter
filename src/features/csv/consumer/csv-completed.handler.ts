import type { Message as SQSMessage } from "@aws-sdk/client-sqs";
import { IMessageHandler } from "../../../core/events/message-handler.interface.js";
import { Topic } from "../../../core/events/topics.js";
import {
  CsvEventCompletedPayload,
  CsvEventCompletedPayloadSchema,
} from "../domain/csv-event-payloads.js";
import { CsvService } from "../application/csv.service.js";
import { logger } from "../../../core/logger.js";

export class CsvProcessingCompletedHandler implements IMessageHandler<CsvEventCompletedPayload> {
  readonly topic = Topic.CSV_PROCESSING_COMPLETED;
  readonly payloadSchema = CsvEventCompletedPayloadSchema;
  readonly prefix = "[CsvProcessingCompletedHandler]";

  constructor(private readonly csvService: CsvService) {}

  async handle(payload: CsvEventCompletedPayload, originalMessage: SQSMessage): Promise<void> {
    const startTime = process.hrtime.bigint();
    logger.info(
      `${this.prefix} Received ${this.topic} event for csvProcessingId: ${payload.jobId}, Message ID: ${originalMessage.MessageId}`,
      { payload }
    );

    try {
      await this.csvService.handleCompletedEvent(payload);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      logger.info(
        `${this.prefix} Successfully initiated processing for csvProcessingId: ${payload.jobId}. Duration: ${durationMs.toFixed(2)}ms`
      );
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      logger.error(
        `${this.prefix} Error processing ${this.topic} for csvProcessingId: ${payload.jobId}. Duration: ${durationMs.toFixed(2)}ms:`,
        { error, payload, messageId: originalMessage.MessageId }
      );

      throw error;
    }
  }
}
