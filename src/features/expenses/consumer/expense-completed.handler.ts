import type { Message as SQSMessage } from "@aws-sdk/client-sqs";
import { IMessageHandler } from "@core/events/message-handler.interface.js";
import { Topic } from "@core/events/topics.js";
import { logger } from "@core/logger.js";
import { ExpenseCompletedPayload } from "@features/expenses/domain/expense.entity.js";
import { ExpenseService } from "@features/expenses/application/expense.service.js";

export class ExpenseCompletedHandler implements IMessageHandler<ExpenseCompletedPayload> {
  readonly topic = Topic.EXPENSE_CREATED;
  readonly prefix = "[ExpenseCompletedHandler]";

  constructor(private readonly expenseService: ExpenseService) {}

  async handle(payload: ExpenseCompletedPayload, originalMessage: SQSMessage): Promise<void> {
    logger.info(
      `${this.prefix} Received ${this.topic} event for expenseId: ${payload.expenseId}, eventType: ${this.topic}, Message ID: ${originalMessage.MessageId}`,
      { payload }
    );

    try {
      await this.expenseService.createMessageOfCreatedExpense(payload);
      logger.info(
        `${this.prefix} Successfully sent notification for expenseId: ${payload.expenseId}, eventType: ${this.topic}`
      );
    } catch (error) {
      logger.error(
        `${this.prefix} Error sending notification for expenseId: ${payload.expenseId}, eventType: ${this.topic}:`,
        { error, payload, messageId: originalMessage.MessageId }
      );

      throw error;
    }
  }
}
