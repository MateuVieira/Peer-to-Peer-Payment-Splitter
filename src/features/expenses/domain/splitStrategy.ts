export type ParticipantShare = {
    participantId: string;
    shareAmount: number;
};

/**
 * Defines the input context for a split strategy's calculateShares method.
 */
export interface SplitStrategyContext {
    /** The total amount of the expense to be split (e.g., in cents or smallest currency unit). */
    amount: number;
    /** A Set containing all member IDs of the group to which this expense belongs. */
    allGroupMemberIds: Set<string>;
    /**
    * Optional array of participant IDs specifically involved in this split.
    * Used by strategies like PARTIAL_EQUAL. If not provided, the strategy might default
    * to using allGroupMemberIds or throw an error if it requires specific participants.
    */
    involvedParticipantIds?: string[];
}

/**
 * Defines the contract for an expense splitting strategy.
 * Each strategy encapsulates the logic for a specific SplitType.
 */
export interface ISplitStrategy {
    /**
     * Calculates the share for each participant based on the strategy's specific rules.
     */
    calculateShares(context: SplitStrategyContext): ParticipantShare[];
}
