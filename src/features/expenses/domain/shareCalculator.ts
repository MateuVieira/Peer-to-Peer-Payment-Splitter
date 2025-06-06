import { AppError, HttpCode } from '../../../core/error/app.error.js';
import { logger } from '../../../core/logger.js';
import { ParticipantShare } from './splitStrategy.js';

function checkTotalShareAmount(participants: ParticipantShare[], amount: number): void {
  const totalShareAmount = participants.reduce((sum, participant) => sum + participant.shareAmount, 0);
  if (totalShareAmount !== amount) {
    logger.error({ calculatedTotal: totalShareAmount, expectedAmount: amount, participants }, "Internal error: Total calculated share amount does not match the expense amount.");
    throw new AppError({ httpCode: HttpCode.INTERNAL_SERVER_ERROR, description: 'Internal calculation error: Total share amount does not match the expense amount.' });
  }
}

function validateParticipants(participantIdsForSplitting: string[], groupMemberIds?: Set<string>): void {
  if (!groupMemberIds) {
    throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Group member IDs are required for participant validation.' });
  }

  if (participantIdsForSplitting.length === 0) {
    throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'No participants specified for splitting.' });
  }

  for (const id of participantIdsForSplitting) {
    if (!groupMemberIds.has(id)) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Participant with ID ${id} (selected for splitting) is not a member of the group.`,
      });
    }
  }
}

export function calculateShares(
  participantIdsForSplitting: string[],
  amount: number,
  groupMemberIds?: Set<string>,
): ParticipantShare[] {
  if (!participantIdsForSplitting || participantIdsForSplitting.length === 0) {
    throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Cannot calculate shares for zero participants.' });
  }

  validateParticipants(participantIdsForSplitting, groupMemberIds);

  const amountInCents = amount;
  const numberOfInvolvedMembers = participantIdsForSplitting.length;
  const baseShare = Math.floor(amountInCents / numberOfInvolvedMembers);
  let remainder = amountInCents % numberOfInvolvedMembers;

  const sortedParticipantIdsForSplitting = [...participantIdsForSplitting].sort();

  const calculatedParticipants = sortedParticipantIdsForSplitting.map(participantId => {
    let shareAmount = baseShare;
    if (remainder > 0) {
      shareAmount++;
      remainder--;
    }
    return { participantId, shareAmount };
  });

  checkTotalShareAmount(calculatedParticipants, amount);
  return calculatedParticipants;
}
