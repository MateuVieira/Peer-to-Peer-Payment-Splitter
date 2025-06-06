import { ISplitStrategy, ParticipantShare, SplitStrategyContext } from "./splitStrategy.js";
import { calculateShares } from "./shareCalculator.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";

export class PartialEqualSplitStrategy implements ISplitStrategy {
  calculateShares(context: SplitStrategyContext): ParticipantShare[] {
    if (!context.involvedParticipantIds || context.involvedParticipantIds.length === 0) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: 'Involved participant IDs are required and cannot be empty for PARTIAL_EQUAL split.',
      });
    }

    const participantIdsForSplitting = [...new Set(context.involvedParticipantIds)];

    return calculateShares(participantIdsForSplitting, context.amount, context.allGroupMemberIds);
  }
}