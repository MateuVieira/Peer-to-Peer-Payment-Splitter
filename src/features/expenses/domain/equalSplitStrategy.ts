import { AppError, HttpCode } from "../../../core/error/app.error.js";
import { calculateShares } from "./shareCalculator.js";
import { ISplitStrategy, ParticipantShare, SplitStrategyContext } from "./splitStrategy.js";

export class EqualSplitStrategy implements ISplitStrategy {
  calculateShares(context: SplitStrategyContext): ParticipantShare[] {
    if (context.allGroupMemberIds.size === 0) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Group has no members for an EQUAL split.' });
    }
    const participantIdsForSplitting = [...context.allGroupMemberIds];
    
    return calculateShares(participantIdsForSplitting, context.amount, context.allGroupMemberIds);
  }
}