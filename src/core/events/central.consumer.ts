import { SqsConsumerService } from "@core/lib/aws/sqs.consumer.service.js";
import { config } from "../../config.js";
import { logger } from "@core/logger.js";
import { NotificationSendHandler } from "@features/notifications/consumer/notification.send.handler.js";
import { SettlementCompletedHandler } from "@features/settlements/consumer/settlement-created.handler.js";
import { ExpenseCompletedHandler } from "@features/expenses/consumer/expense-completed.handler.js";
import { CsvProcessingStartedHandler } from "@features/csv/consumer/csv-started.handler.js";
import { CsvProcessingCompletedHandler } from "@features/csv/consumer/csv-completed.handler.js";
import {
  notificationService,
  settlementService,
  expenseService,
  csvProcessingService,
} from "../container.js";

const centralConsumer = new SqsConsumerService();

const notificationSendHandler = new NotificationSendHandler(notificationService);
const settlementCompletedHandler = new SettlementCompletedHandler(settlementService);
const expenseCompletedHandler = new ExpenseCompletedHandler(expenseService);
const csvProcessingStartedHandler = new CsvProcessingStartedHandler(csvProcessingService);
const csvProcessingCompletedHandler = new CsvProcessingCompletedHandler(csvProcessingService);

centralConsumer.registerHandler(notificationSendHandler);
centralConsumer.registerHandler(settlementCompletedHandler);
centralConsumer.registerHandler(expenseCompletedHandler);
centralConsumer.registerHandler(csvProcessingStartedHandler);
centralConsumer.registerHandler(csvProcessingCompletedHandler);

export function startCentralConsumer(): void {
  const prefix = "[Central Consumer]";

  if (!config.aws.sqsQueueUrl) {
    logger.error(
      `${prefix} SQS_QUEUE_URL not configured in config.aws.sqsQueueUrl. Central SQS consumer will not start.`
    );
    return;
  }

  logger.info(`${prefix} Starting central SQS consumer on queue: ${config.aws.sqsQueueUrl}`);

  centralConsumer
    .startListening(config.aws.sqsQueueUrl)
    .then(() => {
      logger.info(`${prefix} Central SQS consumer has stopped listening.`);
    })
    .catch((error) => {
      logger.error(`${prefix} Error occurred with central SQS consumer:`, error);
    });
}

export { centralConsumer };
