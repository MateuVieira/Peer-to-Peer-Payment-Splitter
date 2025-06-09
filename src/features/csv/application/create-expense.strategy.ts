import { ExpenseService } from "../../expenses/application/expense.service.js";
import {
  CreateExpenseDto,
  CreateExpenseSchema,
} from "../../expenses/application/expense.schemas.js";
import { logger } from "../../../core/logger.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import {
  ICommandStrategy,
  CsvCommandType,
  CommandContext,
  CommandStrategyResult,
} from "../domain/command.strategy.types.js";

export class CreateExpenseStrategy implements ICommandStrategy {
  public readonly commandType = CsvCommandType.CREATE_EXPENSE;

  constructor(private expenseService: ExpenseService) {}

  private _validateCoreData(record: Record<string, string>): CreateExpenseDto {
    const involvedParticipantIdsArray = record.involvedParticipantIds
      ? record.involvedParticipantIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : undefined;

    const dataToValidate = {
      description: record.description,
      amount: Number(record.amount),
      currency: record.currency,
      expenseDate: record.expenseDate,
      splitType: record.splitType,
      groupId: record.groupId,
      payerId: record.payerId,
      involvedParticipantIds: involvedParticipantIdsArray,
      requestingUserId: record.requestingUserId,
    };

    const validationResult = CreateExpenseSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.errors
        .map((e) => `${e.path.join(".") || "CSV_record"}: ${e.message}`)
        .join("; ");
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Invalid CREATE_EXPENSE command data in CSV row. Errors: ${formattedErrors}`,
      });
    }
    return validationResult.data;
  }

  async execute(context: CommandContext): Promise<CommandStrategyResult> {
    const { record, jobId } = context;
    let details: Record<string, unknown> | undefined;
    let errorMsg: string | undefined;

    try {
      logger.info(
        `[CreateExpenseStrategy] Processing record for job ${jobId}: ${JSON.stringify(record)}`
      );
      const csvInput = this._validateCoreData(record);

      const expense = await this.expenseService.createExpense(csvInput);
      details = { expenseId: expense.id, message: "Expense created successfully." };
      logger.info(
        `[CreateExpenseStrategy] Successfully created expense ${expense.id} for job ${jobId}.`
      );

      return {
        success: true,
        commandType: this.commandType,
        processedRecord: record,
        details: details,
      };
    } catch (error) {
      errorMsg = error instanceof AppError ? error.message : (error as Error).message;
      logger.error(
        `[CreateExpenseStrategy] Error processing record for job ${jobId}: ${errorMsg}`,
        error
      );

      return {
        success: false,
        commandType: this.commandType,
        processedRecord: record,
        error: errorMsg,
      };
    }
  }
}
