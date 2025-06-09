// src/core/lib/aws/sqs.producer.service.ts
import { SQSClient, SendMessageCommand, type MessageAttributeValue } from '@aws-sdk/client-sqs';
import { IQueueProducer } from '../../events/event-producer.interface.js';
import { AppError, HttpCode } from '../../error/app.error.js';
import { logger } from '../../logger.js';
import { Topic } from '../../events/topics.js';
import { config } from '../../../config.js';

export class SqsProducerService implements IQueueProducer {
  private sqsClient: SQSClient;
  private defaultQueueUrl?: string;

  constructor() {
    const region = config.aws.region;
    this.sqsClient = new SQSClient({ region });
    this.defaultQueueUrl = config.aws.sqsQueueUrl;
    logger.info(`SqsProducerService initialized with region: ${region} and default queue URL: ${this.defaultQueueUrl || 'not set'}`);
  }

  async sendMessage<T>(
    topic: Topic,
    messageBody: T,
    messageAttributes?: Record<string, { dataType: string; stringValue: string } | undefined>
  ): Promise<string | undefined> {
    const queueUrl = this.resolveQueueUrl(topic);

    if (!queueUrl) {
      logger.error(`SQS Queue URL not found for topic: ${topic}`);
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `SQS queue URL configuration missing for topic ${topic}`,
      });
    }

    try {
      const transformedAttributes: Record<string, MessageAttributeValue> = {};
      if (messageAttributes) {
        for (const key in messageAttributes) {
          const attr = messageAttributes[key];
          if (attr) {
            transformedAttributes[key] = {
              DataType: attr.dataType,
              StringValue: attr.stringValue,
            };
          }
        }
      }

      const finalMessageAttributes: Record<string, MessageAttributeValue> = {
        ...transformedAttributes,
        topic: { DataType: 'String', StringValue: topic.toString() },
      };

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: finalMessageAttributes,
      });

      const result = await this.sqsClient.send(command);
      logger.info(`Message sent to SQS queue ${queueUrl} (topic: ${topic}) with ID: ${result.MessageId}`);
      return result.MessageId;
    } catch (error) {
      logger.error(`Error sending message to SQS queue ${queueUrl} (topic: ${topic}):`, error);
      
      if (error instanceof Error) {
        throw new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: `Failed to send message to SQS (topic: ${topic}): ${error.message}`,
        });
      }

      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `An unknown error occurred while sending message to SQS (topic: ${topic}).`,
      });
    }
  }

  private convertTopicToEnvVarName(topic: string): string {
    return `SQS_QUEUE_URL_${topic.toUpperCase().replace(/\./g, '_')}`;
  }

  private resolveQueueUrl(topic: string): string | undefined {
    if (topic.startsWith('http://') || topic.startsWith('https://')) {
      logger.debug(`Identifier '${topic}' is a direct URL.`);
      return topic;
    }

    const envVarName = this.convertTopicToEnvVarName(topic);
    const specificQueueUrl = process.env[envVarName];

    if (specificQueueUrl) {
      logger.debug(`Resolved topic '${topic}' to SQS queue URL '${specificQueueUrl}' from env var '${envVarName}'.`);
      return specificQueueUrl;
    }

    if (this.defaultQueueUrl) {
      logger.warn(`No specific SQS queue URL found for topic '${topic}' (checked env var '${envVarName}'). Falling back to default SQS queue URL: ${this.defaultQueueUrl}`);
      return this.defaultQueueUrl;
    }
    
    logger.error(`No SQS queue URL could be resolved for topic/identifier '${topic}'. Neither specific env var '${envVarName}' nor a default SQS queue URL is configured.`);
    return undefined;
  }
}
