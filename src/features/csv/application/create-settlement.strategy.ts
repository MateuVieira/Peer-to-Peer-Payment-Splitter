import { SettlementService } from "../../settlements/application/settlement.service.js";
import {
  CreateSettlementDto,
  CreateSettlementSchema,
} from "../../settlements/application/settlement.schemas.js";
import { logger } from "../../../core/logger.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import {
  ICommandStrategy,
  CsvCommandType,
  CommandContext,
  CommandStrategyResult,
} from "../domain/command.strategy.types.js";

type CreateSettlementCSVDto = CreateSettlementDto & {
  settlementDate: Date;
};

export class CreateSettlementStrategy implements ICommandStrategy {
  public readonly commandType = CsvCommandType.CREATE_SETTLEMENT;

  constructor(private settlementService: SettlementService) {}

  private _validateSettlementDate(settlementDate: string | undefined): Date {
    if (!settlementDate) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "settlementDate is required.",
      });
    }

    const parsedSettlementDate = new Date(settlementDate);
    if (isNaN(parsedSettlementDate.getTime())) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Invalid settlementDate format. Expected format: YYYY-MM-DD.",
      });
    }

    return parsedSettlementDate;
  }

  private _validateCoreData(record: Record<string, string>): CreateSettlementCSVDto {
    const dataToValidate = {
      groupId: record.groupId,
      payerId: record.payerId,
      payeeId: record.payeeId,
      amount: Number(record.amount),
      currency: record.currency,
    };

    const validationResult = CreateSettlementSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.errors
        .map((e) => `${e.path.join(".") || "CSV_record"}: ${e.message}`)
        .join("; ");
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Invalid CREATE_SETTLEMENT command data in CSV row. Errors: ${formattedErrors}`,
      });
    }

    const settlementDate = this._validateSettlementDate(record.settlementDate);

    return {
      ...validationResult.data,
      settlementDate,
    } as CreateSettlementCSVDto;
  }

  async execute(context: CommandContext): Promise<CommandStrategyResult> {
    const { record, jobId } = context;
    let details: Record<string, unknown> | undefined;
    let errorMsg: string | undefined;

    try {
      logger.info(
        `[CreateSettlementStrategy] Processing record for job ${jobId}: ${JSON.stringify(record)}`
      );
      const createSettlementDto = this._validateCoreData(record);

      const settlement = await this.settlementService.createSettlement(createSettlementDto);

      details = { settlementId: settlement.id, message: "Settlement created successfully." };

      logger.info(
        `[CreateSettlementStrategy] Successfully created settlement ${settlement.id} for job ${jobId}.`
      );

      return {
        success: true,
        commandType: this.commandType,
        processedRecord: record,
        details: details,
      };
    } catch (error) {
      const typedError = error as Error;
      errorMsg = error instanceof AppError ? error.message : typedError.message;

      logger.error(
        { err: error, jobId, record },
        `[CreateSettlementStrategy] Error processing record for job ${jobId}: ${errorMsg}`
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
