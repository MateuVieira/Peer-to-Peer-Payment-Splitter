import { Topic } from "./topics.js";

/**
 * Interface for a generic queue producer service.
 * This abstraction allows decoupling from specific messaging technologies (e.g., SQS, RabbitMQ).
 */
export interface IQueueProducer {
  /**
   * Sends a message to the specified queue.
   *
   * @template T The type of the message body.
   * @param {Topic} topic - The predefined topic identifying the target queue or event type.
   * @param {T} messageBody - The message payload to send. Will be typically stringified (e.g., to JSON).
   * @param {Record<string, { dataType: string; stringValue: string } | undefined>} [messageAttributes] - Optional message attributes (structure may vary by provider, this is SQS-like).
   * @returns {Promise<string | undefined>} A promise that resolves with the message ID if successful, or undefined.
   */
  sendMessage<T>(
    topic: Topic,
    messageBody: T,
    messageAttributes?: Record<string, { dataType: string; stringValue: string } | undefined>
  ): Promise<string | undefined>;
}
