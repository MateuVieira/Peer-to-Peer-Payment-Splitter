export enum Topic {
  // CSV Processing Topics
  CSV_UPLOAD_COMPLETED = "csv.upload.completed",
  CSV_PROCESSING_STARTED = "csv.processing.started",
  CSV_PROCESSING_COMPLETED = "csv.processing.completed",
  CSV_PROCESSING_FAILED = "csv.processing.failed",
  CSV_PROCESSING_CREATE_TRANSACTION_RESULT_FAILED = "csv.processing.create.transaction.result.failed",
  CSV_COMMAND_PROCESSED = "csv.command.processed",
  CSV_COMMAND_FAILED = "csv.command.failed",

  // Expense Topics
  EXPENSE_CREATED = "expense.created",
  EXPENSE_UPDATED = "expense.updated",
  EXPENSE_DELETED = "expense.deleted",

  // Settlement Topics
  SETTLEMENT_CREATED = "settlement.created",

  // Group Topics
  GROUP_MEMBER_ADDED = "group.member.added",
  GROUP_MEMBER_REMOVED = "group.member.removed",

  // Notification Topics
  NOTIFICATION_SEND = "notification.send",
}
