import { SqsConsumerService } from "../../../core/lib/aws/sqs.consumer.service.js";
import { config } from "../../../config.js";
import { logger } from "../../../core/logger.js";
import { settlementService } from "../../../core/container.js";
import { SettlementCompletedHandler } from "./settlement-created.handler.js";

const settlementCompletedSqsConsumer = new SqsConsumerService();

const settlementCompletedHandler = new SettlementCompletedHandler(settlementService);

settlementCompletedSqsConsumer.registerHandler(settlementCompletedHandler);

function startSettlementConsumer(): void {
  if (!config.aws.sqsQueueUrl) {
    logger.error(
      "SQS_QUEUE_URL not configured in config.aws.sqsQueueUrl. Settlement SQS consumer (from settlement.consumer.ts) will not start."
    );
    return;
  }

  logger.info(
    `Attempting to start Settlement SQS consumer (from settlement.consumer.ts) on queue: ${config.aws.sqsQueueUrl}`
  );
  settlementCompletedSqsConsumer
    .startListening(config.aws.sqsQueueUrl)
    .then(() => {
      logger.info("Settlement SQS consumer (from settlement.consumer.ts) has stopped listening.");
    })
    .catch((error) => {
      logger.error(
        "Error occurred with Settlement SQS consumer (from settlement.consumer.ts):",
        error
      );
    });
}

startSettlementConsumer();

export { settlementCompletedSqsConsumer };
