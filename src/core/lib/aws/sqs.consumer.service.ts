import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { IQueueConsumer } from '../../events/queue-consumer.interface.js';
import type { IMessageHandler, EventPayload } from '../../events/message-handler.interface.js';
import { Topic } from '../../events/topics.js';
import { config } from '../../../config.js';
import { logger } from '../../logger.js';

export class SqsConsumerService implements IQueueConsumer {
  private sqsClient: SQSClient;
  private handlers: Map<Topic, IMessageHandler<EventPayload>> = new Map();
  private isListening: boolean = false;
  private queueUrl?: string;

  constructor() {
    this.sqsClient = new SQSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    logger.info('SqsConsumerService initialized.');
  }

  registerHandler(handler: IMessageHandler<EventPayload>): void {
    if (this.handlers.has(handler.topic)) {
      logger.warn(`Handler for topic ${handler.topic} is already registered. Overwriting.`);
    }
    
    this.handlers.set(handler.topic, handler);
    
    logger.info(`Handler registered for topic: ${handler.topic}`);
  }

  async startListening(queueUrl: string): Promise<void> {
    if (this.isListening) {
      logger.warn(`Already listening on queue: ${this.queueUrl}. Stop current listener before starting a new one.`);
      return;
    }

    this.queueUrl = queueUrl;
    this.isListening = true;
    
    logger.info(`Starting SQS listener on queue: ${this.queueUrl}`);

    while (this.isListening) {
      try {
        const receiveCommand = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          MessageAttributeNames: ['All'],
        });

        const { Messages } = await this.sqsClient.send(receiveCommand);

        if (Messages && Messages.length > 0) {
          for (const message of Messages) {
            await this.processMessage(message);
          }
        } else {
          logger.trace('No messages received, continuing to poll.');
        }

      } catch (error) {
        logger.error('Error receiving messages from SQS:', error);

        if (this.isListening) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    logger.info(`SQS listener stopped for queue: ${this.queueUrl}`);
  }

  private async processMessage(message: Message): Promise<void> {
    if (!message.MessageId || !message.Body || !message.ReceiptHandle) {
      logger.warn('Received incomplete message, skipping:', { messageId: message.MessageId });
      return;
    }

    logger.info(`Processing message: ${message.MessageId}`);

    try {
      const topicAttribute = message.MessageAttributes?.['topic']?.StringValue;
      
      if (!topicAttribute || !Object.values(Topic).includes(topicAttribute as Topic)) {
        logger.error(`Message ${message.MessageId} missing or invalid 'topic' attribute. Skipping.`, { attributes: message.MessageAttributes });
        return;
      }

      const messageTopic = topicAttribute as Topic;

      const handler = this.handlers.get(messageTopic);
      if (!handler) {
        logger.warn(`No handler registered for topic ${messageTopic} from message ${message.MessageId}. Skipping.`);
        return;
      }

      let payload: EventPayload;
      try {
        payload = JSON.parse(message.Body) as EventPayload;
      } catch (parseError) {
        logger.error(`Failed to parse JSON body for message ${message.MessageId}:`, parseError);
        
        return;
      }

      if (handler.payloadSchema) {
        const validationResult = handler.payloadSchema.safeParse(payload);
       
        if (!validationResult.success) {
          logger.error(`Payload validation failed for message ${message.MessageId}, topic ${messageTopic}:`, validationResult.error.format());
          return;
        }
      
        payload = validationResult.data;
      }

      await handler.handle(payload, message);
      logger.info(`Message ${message.MessageId} (topic: ${messageTopic}) processed successfully.`);

      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: this.queueUrl!,
        ReceiptHandle: message.ReceiptHandle,
      });
      
      await this.sqsClient.send(deleteCommand);
      
      logger.info(`Message ${message.MessageId} deleted from queue.`);

    } catch (error) {
      logger.error(`Error processing message ${message.MessageId}:`, error);
    }
  }

  stopListening(): Promise<void> {
    if (!this.isListening) {
      logger.info('Listener is not active.');
    
      return Promise.resolve();
    }

    logger.info(`Stopping SQS listener for queue: ${this.queueUrl}...`);
    
    this.isListening = false;
    
    return Promise.resolve();
  }
}
