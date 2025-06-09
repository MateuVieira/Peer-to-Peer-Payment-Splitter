import { SqsConsumerService } from "../../../core/lib/aws/sqs.consumer.service.js";
import { config } from "../../../config.js";
import { logger } from "../../../core/logger.js";
import { notificationService } from "../../../core/container.js";
import { NotificationSendHandler } from "./notification.send.handler.js";

const notificationConsumer = new SqsConsumerService();

const notificationSendHandler = new NotificationSendHandler(notificationService);

notificationConsumer.registerHandler(notificationSendHandler);

function startNotificationConsumer(): void {
  if (!config.aws.sqsQueueUrl) {
    logger.error(
      "SQS_QUEUE_URL not configured in config.aws.sqsQueueUrl. Notification SQS consumer (from notification.consumer.ts) will not start."
    );
    return;
  }

  logger.info(
    `Attempting to start Notification SQS consumer (from notification.consumer.ts) on queue: ${config.aws.sqsQueueUrl}`
  );
  notificationConsumer
    .startListening(config.aws.sqsQueueUrl)
    .then(() => {
      logger.info(
        "Notification SQS consumer (from notification.consumer.ts) has stopped listening."
      );
    })
    .catch((error) => {
      logger.error(
        "Error occurred with Notification SQS consumer (from notification.consumer.ts):",
        error
      );
    });
}

startNotificationConsumer();

export { notificationConsumer };
