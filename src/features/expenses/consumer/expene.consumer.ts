import { SqsConsumerService } from "../../../core/lib/aws/sqs.consumer.service.js";
import { config } from "../../../config.js";
import { logger } from "../../../core/logger.js";
import { ExpenseCompletedHandler } from "./expense-completed.handler.js";
import { expenseService } from "../../../core/container.js";

const expenseCompletedSqsConsumer = new SqsConsumerService();

const expenseCompletedHandler = new ExpenseCompletedHandler(expenseService);

expenseCompletedSqsConsumer.registerHandler(expenseCompletedHandler);

function startExpenseConsumer(): void {
  if (!config.aws.sqsQueueUrl) {
    logger.error(
      "SQS_QUEUE_URL not configured in config.aws.sqsQueueUrl. Expense SQS consumer (from expense.consumer.ts) will not start."
    );
    return;
  }

  logger.info(
    `Attempting to start Expense SQS consumer (from expense.consumer.ts) on queue: ${config.aws.sqsQueueUrl}`
  );
  expenseCompletedSqsConsumer
    .startListening(config.aws.sqsQueueUrl)
    .then(() => {
      logger.info("Expense SQS consumer (from expense.consumer.ts) has stopped listening.");
    })
    .catch((error) => {
      logger.error("Error occurred with Expense SQS consumer (from expense.consumer.ts):", error);
    });
}

startExpenseConsumer();

export { expenseCompletedSqsConsumer };
