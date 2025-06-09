export enum CsvJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  // Consider adding QUEUED if needed for more granularity between PENDING and PROCESSING
}

export enum CsvCommandType {
  CREATE_GROUP = 'CREATE_GROUP',
  CREATE_USER = 'CREATE_USER',
  ADD_USER_TO_GROUP = 'ADD_USER_TO_GROUP',
  REMOVE_USER_FROM_GROUP = 'REMOVE_USER_FROM_GROUP',
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  CREATE_SETTLEMENT = 'CREATE_SETTLEMENT'
}

export enum CsvCommandStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface CsvProcessingJob {
  id: string;
  fileName: string;
  s3Key: string;
  bucketName: string;
  status: CsvJobStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  createdBy: string; // User ID
  totalCommands?: number;
  processedCommands?: number;
  failedCommands?: number;
  errorMessage?: string;
  processingStartedAt?: Date;
}

export interface CsvCommandResult {
  jobId: string;
  commandType: CsvCommandType;
  lineNumber: number;
  status: CsvCommandStatus;
  errorMessage?: string;
}

export enum CsvHeaders {
  COMMAND_TYPE = 'commandType', // CsvCommandType
  DESCRIPTION = 'description', // string | undefined 
  CURRENCY = 'currency', // USD or BRL | undefined
  AMOUNT = 'amount', // in cents
  SETTLEMENT_DATE = 'settlementDate', // YYYY-MM-DD | undefined
  GROUP_ID = 'groupId', // UUID
  PAYER_ID = 'payerId', // UUID / 
  PAYEE_ID = 'payeeId', // UUID
  INVOLVED_PARTICIPANT_IDS = 'involvedParticipantIds', // UUIDs separated by commas | undefined
  REQUESTING_USER_ID = 'requestingUserId', // UUID
  SPLIT_TYPE = 'splitType', // SplitType | undefined
  EXPENSE_DATE = 'expenseDate', // YYYY-MM-DD | undefined
}
  
