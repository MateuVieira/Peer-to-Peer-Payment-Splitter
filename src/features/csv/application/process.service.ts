

import {
  ICommandStrategy,
  CommandContext,
  CommandStrategyResult,
  CsvCommandType,
  CSVRecord,
} from "../domain/command.strategy.types.js";

export class ProcessService {
  private strategyMap: Map<CsvCommandType, ICommandStrategy>;

  constructor(strategies: ICommandStrategy[]) {
    this.strategyMap = new Map(
      strategies.map((strategy) => [strategy.commandType, strategy])
    );
  }

  public parseData(row: CSVRecord, jobId: string, userId: string): CommandContext {
    const commandTypeFromRow = row.commandType;

    if (typeof commandTypeFromRow !== 'string' || commandTypeFromRow.trim() === '') {
      throw new Error(
        `Invalid or missing 'commandType' in CSV row. Expected a non-empty string. Received: ${commandTypeFromRow}. Row data: ${JSON.stringify(row)}`
      );
    }

    const isValidCommandType = Object.values(CsvCommandType).includes(commandTypeFromRow as CsvCommandType);

    if (!isValidCommandType) {
      throw new Error(
        `Invalid 'commandType' value in CSV row: '${commandTypeFromRow}'. Must be one of [${Object.values(CsvCommandType).join(', ')}]. Row data: ${JSON.stringify(row)}`
      );
    }

    return {
      commandType: commandTypeFromRow as CsvCommandType,
      record: row,
      jobId,
      userId,
    };
  }

  public getStrategy(context: CommandContext): {strategy: ICommandStrategy, context: CommandContext} {
    const strategy = this.strategyMap.get(context.commandType);
    if (!strategy) {
      throw new Error(`Strategy not found for command type: ${context.commandType}`);
    }

    return {context, strategy};
  }

  public async execute(
    {context, strategy}: {context: CommandContext, strategy: ICommandStrategy}
  ): Promise<CommandStrategyResult> {
    return strategy.execute(context);
  }
}