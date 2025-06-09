import type { IMessageHandler, EventPayload } from "./message-handler.interface.js";

/**
 * Interface for a queue consumer service.
 * This service is responsible for polling a queue, retrieving messages,
 * and dispatching them to appropriate registered handlers.
 */
export interface IQueueConsumer {
  /**
   * Registers a message handler with the consumer service.
   * The consumer service will use this handler to process messages matching its topic.
   *
   * @param {IMessageHandler<EventPayload>} handler - The message handler to register.
   */
  registerHandler(handler: IMessageHandler<EventPayload>): void;

  /**
   * Starts listening for messages on the specified queue.
   *
   * @param {string} queueUrl - The URL of the SQS queue to listen to.
   * @returns {Promise<void>} A promise that resolves when listening starts, though typically this method runs a continuous loop.
   */
  startListening(queueUrl: string): Promise<void>;

  /**
   * Stops the consumer from listening for new messages.
   * Should allow in-flight messages to complete processing if possible.
   *
   * @returns {Promise<void>} A promise that resolves when the consumer has stopped.
   */
  stopListening(): Promise<void>;
}
