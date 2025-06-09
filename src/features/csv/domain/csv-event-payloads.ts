import { z } from "zod";
import { CsvJobStatus } from "./csv.entity.js";

// Schema for the payload of the CSV_PROCESSING_STARTED event
export const CsvProcessingStartedPayloadSchema = z.object({
  jobId: z.string().uuid(), // The ID of the CSV processing job (formerly csvProcessingId)
  bucketName: z.string(), // The S3 bucket where the CSV file is stored (formerly s3Bucket)
  s3Key: z.string(), // The S3 key for the CSV file
  userId: z.string().uuid(), // The ID of the user who uploaded the file (formerly uploadedByUserId)
});

// TypeScript type inferred from the schema
export type CsvProcessingStartedPayload = z.infer<typeof CsvProcessingStartedPayloadSchema>;

// Schema for the payload of the PAYMENT_COMMAND_PROCESSED event
export const PaymentCommandProcessedPayloadSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  command: z.record(z.string(), z.unknown()), // Represents a single processed command/row from the CSV
  timestamp: z.string().datetime(),
});
export type PaymentCommandProcessedPayload = z.infer<typeof PaymentCommandProcessedPayloadSchema>;

// Schema for the payload of the CSV_PROCESSING_FAILED event
export const CsvProcessingFailedPayloadSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  fileName: z.string(), // Added fileName
  s3Key: z.string(),
  bucketName: z.string(),
  errors: z.array(z.string()), // Consider if this is still needed if individual command results are detailed
  reason: z.string(), // Overall failure reason
});
export type CsvProcessingFailedPayload = z.infer<typeof CsvProcessingFailedPayloadSchema>;

// Schema for the payload of the CSV_PROCESSING_COMPLETED event
export const CsvProcessingCompletedPayloadSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  fileName: z.string(), // Added fileName
  s3Key: z.string(), // s3Key might be redundant if fileName and job context is enough, but keeping for now
  bucketName: z.string(), // bucketName might also be redundant
  totalCommands: z.number().int().min(0),
  commandsProcessed: z.number().int().min(0),
  commandsFailed: z.number().int().min(0),
  status: z.nativeEnum(CsvJobStatus),
  errorMessage: z.string().optional(),
});

export type CsvProcessingCompletedPayload = z.infer<typeof CsvProcessingCompletedPayloadSchema>;

export const CsvEventCompletedPayloadSchema = z.object({
  jobId: z.string().uuid(),
});

export type CsvEventCompletedPayload = z.infer<typeof CsvEventCompletedPayloadSchema>;

// Schema for the payload of the CSV_PROCESSING_CREATE_TRANSACTION_RESULT_FAILED event
export const CsvProcessingCreateTransactionResultFailedPayloadSchema = z.object({
  jobId: z.string().uuid(),
  commandType: z.string(),
  lineNumber: z.number().int().min(1),
  status: z.enum(["SUCCESS", "FAILED"]),
  errorMessage: z.string(),
});
export type CsvProcessingCreateTransactionResultFailedPayload = z.infer<
  typeof CsvProcessingCreateTransactionResultFailedPayloadSchema
>;
