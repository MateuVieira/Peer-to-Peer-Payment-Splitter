import { CsvHeaders } from "./csv.entity.js";

/**
 * Defines the types of commands that can be processed from a CSV file.
 * These should correspond to specific actions to be taken in the system.
 */
export enum CsvCommandType {
  CREATE_USER = "CREATE_USER",
  ADD_USER_TO_GROUP = "ADD_USER_TO_GROUP",
  REMOVE_USER_FROM_GROUP = "REMOVE_USER_FROM_GROUP",
  CREATE_GROUP = "CREATE_GROUP",
  CREATE_EXPENSE = "CREATE_EXPENSE",
  CREATE_SETTLEMENT = "CREATE_SETTLEMENT",
}

export type CSVRecord = Record<CsvHeaders, string>;

/**
 * Context provided to a command strategy when it's executed.
 * Contains the raw CSV record and relevant job/user identifiers.
 */
export interface CommandContext {
  /** The type of command to be executed, derived from the CSV row. */
  commandType: CsvCommandType;
  /** The raw data record parsed from a single CSV row. */
  record: CSVRecord;
  /** The ID of the parent CsvProcessingJob. */
  jobId: string;
  /** The ID of the user who initiated the CsvProcessingJob. */
  userId: string;
}

/**
 * Represents the result of executing a command strategy.
 */
export interface CommandStrategyResult {
  /** Indicates whether the command execution was successful. */
  success: boolean;
  /** An error message if the command execution failed. */
  error?: string;
  /** Any additional details or output from the strategy execution. */
  details?: Record<string, unknown>;
  /** The original CSV record that was processed. */
  processedRecord: CSVRecord;
  /** The command type that was processed. */
  commandType: CsvCommandType | string; // Allow string for unrecognized commands
}

/**
 * Interface for a command strategy.
 * Each concrete strategy will implement this to handle a specific CsvCommandType.
 */
export interface ICommandStrategy {
  /** The specific command type that this strategy handles. */
  readonly commandType: CsvCommandType;

  /**
   * Executes the command based on the provided context.
   * @param context The context for command execution.
   * @returns A promise that resolves to the result of the command execution.
   */
  execute(context: CommandContext): Promise<CommandStrategyResult>;
}
