import { SqsConsumerService } from "../../../core/lib/aws/sqs.consumer.service.js";
import { config } from "../../../config.js";
import { logger } from "../../../core/logger.js";
import { CsvProcessingStartedHandler } from "./csv-started.handler.js";
import { csvProcessingService } from "../../../core/container.js";

const csvProcessingSqsConsumer = new SqsConsumerService();

const csvProcessingStartedHandler = new CsvProcessingStartedHandler(csvProcessingService);

csvProcessingSqsConsumer.registerHandler(csvProcessingStartedHandler);

function startCsvConsumer(): void {
  if (!config.aws.sqsQueueUrl) {
    logger.error(
      "SQS_QUEUE_URL not configured in config.aws.sqsQueueUrl. CSV SQS consumer (from csv.consumer.ts) will not start."
    );
    return;
  }

  logger.info(
    `Attempting to start CSV Processing SQS consumer (from csv.consumer.ts) on queue: ${config.aws.sqsQueueUrl}`
  );
  csvProcessingSqsConsumer
    .startListening(config.aws.sqsQueueUrl)
    .then(() => {
      logger.info("CSV Processing SQS consumer (from csv.consumer.ts) has stopped listening.");
    })
    .catch((error) => {
      logger.error(
        "Error occurred with CSV Processing SQS consumer (from csv.consumer.ts):",
        error
      );
    });
}

startCsvConsumer();

export { csvProcessingSqsConsumer };
