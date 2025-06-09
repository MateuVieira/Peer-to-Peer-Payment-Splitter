import type { Message as SQSMessage } from "@aws-sdk/client-sqs";
import type { ZodSchema } from "zod";
import type { Topic } from "./topics.js";

/**
 * Defines the structure for an event's data payload.
 * This is a generic placeholder; specific events will have more defined payloads.
 */
export type EventPayload = Record<string, unknown>;

/**
 * Interface for a message handler that processes messages for a specific topic.
 *
 * @template TPayload The expected type of the deserialized and validated message payload.
 */
export interface IMessageHandler<TPayload extends EventPayload = EventPayload> {
  /**
   * The topic this handler is responsible for.
   */
  readonly topic: Topic;

  /**
   * Optional Zod schema to validate the incoming message payload.
   * If provided, the SqsConsumerService will use this to validate the data before calling `handle`.
   */
  readonly payloadSchema?: ZodSchema<TPayload>;

  /**
   * Handles a successfully received, deserialized, and (if schema provided) validated message.
   *
   * @param {TPayload} payload - The deserialized and validated message payload.
   * @param {SQSMessage} originalMessage - The original SQS message, TODO: change this to an internal type
   * @returns {Promise<void>} A promise that resolves when handling is complete.
   */
  handle(payload: TPayload, originalMessage: SQSMessage): Promise<void>;
}
