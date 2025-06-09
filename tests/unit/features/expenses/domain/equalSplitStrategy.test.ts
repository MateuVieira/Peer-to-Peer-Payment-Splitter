import { EqualSplitStrategy } from "../../../../../src/features/expenses/domain/equalSplitStrategy.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import type {
  SplitStrategyContext,
  ParticipantShare,
} from "../../../../../src/features/expenses/domain/splitStrategy.js";

describe("EqualSplitStrategy", () => {
  let strategy: EqualSplitStrategy;

  beforeEach(() => {
    strategy = new EqualSplitStrategy();
  });

  it("should split an amount equally among all group members", () => {
    const context: SplitStrategyContext = {
      amount: 10000,
      allGroupMemberIds: new Set(["user1", "user2", "user3", "user4"]),
      involvedParticipantIds: [],
    };
    const expectedShares: ParticipantShare[] = [
      { participantId: "user1", shareAmount: 2500 },
      { participantId: "user2", shareAmount: 2500 },
      { participantId: "user3", shareAmount: 2500 },
      { participantId: "user4", shareAmount: 2500 },
    ];
    const actualShares = strategy.calculateShares(context);
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );
    const sortedExpectedShares = [...expectedShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );
    expect(sortedActualShares).toEqual(sortedExpectedShares);
  });

  it("should distribute remainder deterministically (sorted by ID)", () => {
    const context: SplitStrategyContext = {
      amount: 1001,
      allGroupMemberIds: new Set(["userC", "userA", "userB"]),
    };
    const actualShares = strategy.calculateShares(context);
    const expectedShares: ParticipantShare[] = [
      { participantId: "userA", shareAmount: 334 },
      { participantId: "userB", shareAmount: 334 },
      { participantId: "userC", shareAmount: 333 },
    ];
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );
    expect(sortedActualShares).toEqual(expectedShares);
  });

  it("should throw AppError if group has no members", () => {
    const context: SplitStrategyContext = {
      amount: 100,
      allGroupMemberIds: new Set(),
    };
    expect(() => strategy.calculateShares(context)).toThrow(
      new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Group has no members for an EQUAL split.",
      })
    );
  });

  it("should handle a single member group", () => {
    const context: SplitStrategyContext = {
      amount: 500,
      allGroupMemberIds: new Set(["user1"]),
    };
    const expectedShares: ParticipantShare[] = [{ participantId: "user1", shareAmount: 500 }];
    const actualShares = strategy.calculateShares(context);
    expect(actualShares).toEqual(expectedShares);
  });

  it("should handle zero amount correctly", () => {
    const context: SplitStrategyContext = {
      amount: 0,
      allGroupMemberIds: new Set(["user1", "user2"]),
    };
    const expectedShares: ParticipantShare[] = [
      { participantId: "user1", shareAmount: 0 },
      { participantId: "user2", shareAmount: 0 },
    ];
    const actualShares = strategy.calculateShares(context);
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );
    expect(sortedActualShares).toEqual(expectedShares);
  });
});
