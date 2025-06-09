import type { Message as SQSMessage } from "@aws-sdk/client-sqs";
import { IMessageHandler } from "../../../core/events/message-handler.interface.js";
import { Topic } from "../../../core/events/topics.js";
import { logger } from "../../../core/logger.js";
import { SettlementCompletedPayload } from "../domain/settlement.entity.js";
import { SettlementService } from "../application/settlement.service.js";

export class SettlementCompletedHandler implements IMessageHandler<SettlementCompletedPayload> {
  readonly topic = Topic.SETTLEMENT_CREATED;
  readonly prefix = "[SettlementCompletedHandler]";

  constructor(private readonly settlementService: SettlementService) {}

  async handle(payload: SettlementCompletedPayload, originalMessage: SQSMessage): Promise<void> {
    logger.info(
      `${this.prefix} Received ${this.topic} event for settlementId: ${payload.settlementId}, eventType: ${this.topic}, Message ID: ${originalMessage.MessageId}`,
      { payload }
    );

    try {
      await this.settlementService.createMessageOfCreatedSettlement(payload);
      logger.info(
        `${this.prefix} Successfully initiated processing for settlementId: ${payload.settlementId}, eventType: ${this.topic}`
      );
    } catch (error) {
      logger.error(
        `${this.prefix} Error processing ${this.topic} for settlementId: ${payload.settlementId}, eventType: ${this.topic}:`,
        { error, payload, messageId: originalMessage.MessageId }
      );

      throw error;
    }
  }
}
