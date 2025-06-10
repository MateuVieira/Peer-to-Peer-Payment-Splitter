import { Parser } from "csv-parse";
import { S3Service } from "../../../core/lib/aws/s3.service.js";
import { IQueueProducer } from "../../../core/events/event-producer.interface.js";
import { Topic } from "../../../core/events/topics.js";
import { ICsvRepository as ICsvRepository } from "../domain/csv.repository.js";
import {
  CsvProcessingJob,
  CsvJobStatus,
  CsvCommandResult,
  CsvCommandStatus,
} from "../domain/csv.entity.js";
import { CsvCommandType, CSVRecord } from "../domain/command.strategy.types.js";
import {
  CsvProcessingStartedPayload,
  CsvProcessingCompletedPayload,
  CsvProcessingCreateTransactionResultFailedPayload,
  CsvEventCompletedPayload,
} from "../domain/csv-event-payloads.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import { logger } from "../../../core/logger.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { Readable } from "stream";
import { ProcessService } from "./process.service.js";
import { UserService } from "../../users/application/user.service.js";

interface ProcessingSummary {
  successfulCommands: number;
  failedCommands: number;
  totalRecordsInFile: number;
}

export interface UploadResult {
  jobId: string;
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface JobStatusResult {
  job: CsvProcessingJob;
  commandResults: CsvCommandResult[];
}

const EXPIRES_IN = 3600;

export class CsvService {
  constructor(
    private csvProcessingRepository: ICsvRepository,
    private s3Service: S3Service,
    private queueProducer: IQueueProducer,
    private processService: ProcessService,
    private userService: UserService
  ) {}

  /**
   * Initiates a CSV upload by creating a job record and generating a presigned URL
   */
  async initiateUpload(fileName: string, userId: string): Promise<UploadResult> {
    const fileExtension = path.extname(fileName);
    if (fileExtension.toLowerCase() !== ".csv") {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Only CSV files are allowed.",
      });
    }

    const jobId = uuidv4();
    const s3Key = `csv-uploads/${userId}/${jobId}${fileExtension}`;

    try {
      await this.csvProcessingRepository.createJob({
        id: jobId,
        fileName,
        s3Key,
        bucketName: this.s3Service.bucketName,
        status: CsvJobStatus.PENDING,
        createdBy: userId,
      });

      const presignedUrl = await this.s3Service.generatePresignedUrl(s3Key, "text/csv", EXPIRES_IN);

      return {
        jobId,
        presignedUrl,
        s3Key,
        expiresIn: EXPIRES_IN,
      };
    } catch (err: unknown) {
      const errorMessage = (err as Error).toString();

      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Failed to generate presigned URL, error: ${errorMessage}`,
      });
    }
  }

  /**
   * Gets the status of a CSV processing job
   */
  async getJobStatus(jobId: string): Promise<JobStatusResult> {
    const job = await this.csvProcessingRepository.findJobById(jobId);
    if (!job) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Job with ID ${jobId} not found.`,
      });
    }

    const commandResults = await this.csvProcessingRepository.findCommandResultsByJobId(jobId);

    return {
      job,
      commandResults,
    };
  }

  /**
   * Confirms a CSV file upload and queues it for processing.
   * This method is called by an endpoint after the client confirms successful S3 upload.
   */
  async confirmUploadAndInitiateProcessing(jobId: string): Promise<void> {
    logger.info(`[CsvProcessingService] Confirming upload for job ID: ${jobId}`);

    const job = await this.csvProcessingRepository.findJobById(jobId);
    if (!job) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Job with ID ${jobId} not found.`,
      });
    }

    if (job.status !== CsvJobStatus.PENDING) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Job with ID ${jobId} is not in PENDING status. Current status: ${job.status}.`,
      });
    }

    // Update job status to indicate it's queued for processing
    // Using PENDING for now as processFileFromEvent will set it to PROCESSING.
    // Consider adding a new status like QUEUED if needed for more granularity.
    // For now, keeping it simple: PENDING -> (SQS) -> PROCESSING

    const payload: CsvProcessingStartedPayload = {
      jobId: job.id,
      userId: job.createdBy,
      s3Key: job.s3Key,
      bucketName: job.bucketName,
    };

    await this.queueProducer.sendMessage<CsvProcessingStartedPayload>(
      Topic.CSV_PROCESSING_STARTED,
      payload
    );
  }

  public async processFileFromEvent(payload: CsvProcessingStartedPayload): Promise<void> {
    logger.info(
      `[CsvProcessingService] Received event to process file for job ID: ${payload.jobId}`,
      { payload }
    );
    const { jobId, userId, s3Key } = payload;

    try {
      const job = await this._getJobById(jobId);

      this._validateJob(job, userId);

      await this._updateJobStatus(job.id, CsvJobStatus.PROCESSING, {
        processingStartedAt: new Date(),
      });

      const stream: Readable = await this.s3Service.getFile(s3Key);

      const summary = await this._handleFileProcessing(job, stream);

      await this._finalizeJob(job, summary);

      const completionEventPayload = this._buildCompletionEventPayload(job);

      await this.queueProducer.sendMessage<CsvProcessingCompletedPayload>(
        Topic.CSV_PROCESSING_COMPLETED,
        completionEventPayload
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown critical error in processing workflow.";
      logger.error(`[CsvProcessingService] Critical error for job ${jobId}: ${errorMessage}`, {
        error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (jobId) {
        // If jobId is available, attempt to mark as FAILED
        await this._handleCriticalErrorAndUpdateJob(jobId, errorMessage);
      }
      // If jobId is not even available, this is a more severe system issue.
    }
  }

  private async _handleFileProcessing(
    job: CsvProcessingJob,
    stream: Readable
  ): Promise<ProcessingSummary> {
    const summary: ProcessingSummary = {
      successfulCommands: 0,
      failedCommands: 0,
      totalRecordsInFile: 0,
    };

    const parser = new Parser({ bom: true, columns: true, skipEmptyLines: true });

    stream.pipe(parser);

    try {
      for await (const row of parser) {
        summary.totalRecordsInFile++;

        await this._handleFileProcessingData(job, row as CSVRecord, summary);
      }

      return summary;
    } catch (err) {
      logger.error(
        `[CsvProcessingService] Stream error while processing file for job ${job.id}. Records processed before error: ${summary.totalRecordsInFile}. Successful: ${summary.successfulCommands}, Failed: ${summary.failedCommands}.`,
        { error: err, jobId: job.id }
      );

      return summary;
    }
  }

  private async _handleFileProcessingData(
    job: CsvProcessingJob,
    row: CSVRecord,
    summary: ProcessingSummary
  ): Promise<void> {
    logger.info(
      `[handleFileProcessingData] Processing row ${summary.totalRecordsInFile} for job ${job.id}:`,
      { rowData: row }
    );

    let actualCommandType: CsvCommandType | string = "UNKNOWN_COMMAND_TYPE";

    try {
      const context = this.processService.parseData(row, job.id, job.createdBy);
      actualCommandType = context.commandType;

      const strategyAndContext = this.processService.getStrategy(context);
      const resultFromStrategy = await this.processService.execute(strategyAndContext);

      if (!resultFromStrategy.success) {
        throw new Error(
          resultFromStrategy.error || "Command execution failed without a specific error message"
        );
      }

      summary.successfulCommands++;
      await this._createTransactionResult(
        job,
        actualCommandType,
        summary.totalRecordsInFile,
        CsvCommandStatus.SUCCESS
      );
    } catch (error: unknown) {
      summary.failedCommands++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        `[handleFileProcessingData] Error processing command: job ${job.id}, command ${actualCommandType}, line ${summary.totalRecordsInFile}. Error: ${errorMessage}`,
        { rowData: row, errorDetails: error }
      );
      await this._createTransactionResult(
        job,
        actualCommandType,
        summary.totalRecordsInFile,
        CsvCommandStatus.FAILED,
        errorMessage
      );
    }
  }

  private async _createTransactionResult(
    job: CsvProcessingJob,
    actualCommandType: string,
    lineNumber: number,
    status: CsvCommandStatus,
    errorMessage?: string
  ) {
    const commandResultToPersist: Omit<CsvCommandResult, "id"> = {
      jobId: job.id,
      commandType: actualCommandType as CsvCommandType,
      lineNumber,
      status,
      errorMessage,
    };

    try {
      await this.csvProcessingRepository.saveCommandResult(commandResultToPersist);
    } catch (persistError: unknown) {
      const persistErrorMessage =
        persistError instanceof Error ? persistError.message : String(persistError);
      logger.error(
        `[CsvProcessingService] CRITICAL: Failed to persist successful command result for job ${job.id}, line ${lineNumber}. Error: ${persistErrorMessage}`,
        { commandResultData: commandResultToPersist, errorDetails: persistError }
      );

      await this.queueProducer.sendMessage<CsvProcessingCreateTransactionResultFailedPayload>(
        Topic.CSV_PROCESSING_CREATE_TRANSACTION_RESULT_FAILED,
        {
          ...commandResultToPersist,
        } as CsvProcessingCreateTransactionResultFailedPayload
      );
    }
  }

  private _buildCompletionEventPayload(job: CsvProcessingJob): CsvProcessingCompletedPayload {
    return {
      ...job,
      jobId: job.id,
      userId: job.createdBy,
      totalCommands: job.totalCommands ?? 0,
      commandsProcessed: job.processedCommands ?? 0,
      commandsFailed: job.failedCommands ?? 0,
    };
  }

  private async _getJobById(jobId: string): Promise<CsvProcessingJob> {
    try {
      const job = await this.csvProcessingRepository.findJobById(jobId);

      if (!job) {
        logger.error(`[CsvProcessingService] Job not found: ${jobId}.`);

        throw new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Job with ID ${jobId} not found.`,
        });
      }
      return job;
    } catch (error) {
      logger.error(`[CsvProcessingService] Error getting job ${jobId}:`, { error });

      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Failed to get job ${jobId}.`,
      });
    }
  }

  private _validateJob(job: CsvProcessingJob, expectedUserId: string) {
    if (job.createdBy !== expectedUserId) {
      logger.error(
        `[CsvProcessingService] User ID mismatch for job ${job.id}. Expected ${job.createdBy}, got ${expectedUserId}.`
      );
      throw new AppError({
        httpCode: HttpCode.FORBIDDEN,
        description: "You do not have permission to view this job.",
      });
    }

    // TODO: Look for this validation for cases are we have a problem on the middle of the process
    // as this process can take some time for large files
    // we can find cases are the is on Processing but we don't have more a execution of this file
    // because the server was down or something like that
    if (
      [CsvJobStatus.PROCESSING, CsvJobStatus.COMPLETED, CsvJobStatus.FAILED].includes(job.status)
    ) {
      logger.warn(
        `[CsvProcessingService] Job ${job.id} is already in a terminal or processing state: ${job.status}. Skipping.`
      );
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Job with ID ${job.id} is not in PENDING status. Current status: ${job.status}.`,
      });
    }
  }

  private async _updateJobStatus(
    jobId: string,
    status: CsvJobStatus,
    updates: Partial<CsvProcessingJob>
  ): Promise<void> {
    try {
      await this.csvProcessingRepository.updateJob(jobId, {
        ...updates,
        status,
        updatedAt: new Date(),
      });
      logger.info(`[CsvProcessingService] Job ${jobId} status updated to ${status}.`);
    } catch (error) {
      logger.error(`[CsvProcessingService] Failed to update job ${jobId} status to ${status}.`, {
        error,
      });

      throw error;
    }
  }

  private async _finalizeJob(job: CsvProcessingJob, summary: ProcessingSummary): Promise<void> {
    const { totalRecordsInFile, failedCommands, successfulCommands } = summary;
    let finalStatus: CsvJobStatus;
    let jobErrorMessage: string | undefined = undefined;

    if (failedCommands === 0 && successfulCommands === totalRecordsInFile) {
      finalStatus = CsvJobStatus.COMPLETED;
    } else if (failedCommands > 0 && failedCommands === totalRecordsInFile) {
      finalStatus = CsvJobStatus.FAILED;
      jobErrorMessage = "All commands in the CSV failed to process.";
    } else if (failedCommands > 0) {
      finalStatus = CsvJobStatus.COMPLETED_WITH_ERRORS; // Or PARTIALLY_COMPLETED
      jobErrorMessage = `${failedCommands} command(s) failed during processing.`;
    } else if (successfulCommands < totalRecordsInFile) {
      // This case implies some records were perhaps skipped or not processed, and not explicitly failed.
      // Needs careful consideration based on how CsvRowProcessorService reports its summary.
      finalStatus = CsvJobStatus.COMPLETED_WITH_ERRORS;
      jobErrorMessage = "Some records may not have been processed or resulted in errors.";
    } else {
      // Default to completed if no errors and all expected commands processed
      finalStatus = CsvJobStatus.COMPLETED;
    }

    await this._updateJobStatus(job.id, finalStatus, {
      completedAt: new Date(),
      totalCommands: totalRecordsInFile,
      processedCommands: successfulCommands,
      failedCommands,
      errorMessage: jobErrorMessage,
    });
  }

  private async _handleCriticalErrorAndUpdateJob(
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    logger.error(
      `[CsvProcessingService] Handling critical error for job ${jobId}: ${errorMessage}`
    );
    try {
      await this.csvProcessingRepository.updateJob(jobId, {
        status: CsvJobStatus.FAILED,
        errorMessage: errorMessage,
        updatedAt: new Date(),
        completedAt: new Date(), // Mark as completed even on failure
      });
      // TODO: Send CsvProcessingFailedPayload
      // await this._sendJobFailedEvent(jobId, errorMessage);
    } catch (updateError) {
      logger.error(
        `[CsvProcessingService] CRITICAL: Failed to even update job ${jobId} to FAILED after an error.`,
        { updateError }
      );
    }
  }

  private async handleCreateMessageEventCompleted(job: CsvProcessingJob) {
    const user = await this.userService.getUserById(job.createdBy);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `User with ID ${job.createdBy} not found.`,
      });
    }

    const completedAt = job.completedAt ? new Date(job.completedAt).toLocaleString() : "Unknown";

    const subject = `CSV Processing Job ${job.status === CsvJobStatus.COMPLETED ? "Completed" : "Failed"}`;

    let body = `Hi ${user.name},\n\n`;
    body += `Your CSV processing job has ${job.status === CsvJobStatus.COMPLETED ? "completed" : "finished with errors"}.\n\n`;
    body += `Job Details:\n`;
    body += `- File: ${job.fileName}\n`;
    body += `- Completed at: ${completedAt}\n`;

    if (job.totalCommands !== undefined) {
      body += `- Commands processed: ${job.totalCommands}\n`;
    }

    if (job.processedCommands !== undefined && job.failedCommands !== undefined) {
      body += `- Successful: ${job.processedCommands - job.failedCommands}\n`;
      body += `- Failed: ${job.failedCommands}\n\n`;

      if (job.failedCommands > 0 && job.errorMessage) {
        body += `Error summary: ${job.errorMessage}\n\n`;
      }
    }

    body += `\nThank you for using our service.`;

    return { subject, body, email: user.email };
  }

  async handleCompletedEvent(payload: CsvEventCompletedPayload) {
    const job = await this._getJobById(payload.jobId);
    if (!job) {
      logger.error(`[CsvProcessingService] Job not found: ${payload.jobId}.`);
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Job with ID ${payload.jobId} not found.`,
      });
    }

    try {
      const notificationDetails = await this.handleCreateMessageEventCompleted(job);

      await this.queueProducer.sendMessage(Topic.NOTIFICATION_SEND, {
        eventId: payload.jobId,
        eventType: Topic.NOTIFICATION_SEND,
        recipientEmail: notificationDetails.email,
        subject: notificationDetails.subject,
        body: notificationDetails.body,
      });

      logger.info(`Notification sent for completed CSV job: ${payload.jobId}`);
    } catch (error) {
      logger.error(
        `Failed to send notification for CSV job ${payload.jobId}: ${error instanceof Error ? error.message : String(error)}`,
        { jobId: payload.jobId, error }
      );
    }
  }
}
