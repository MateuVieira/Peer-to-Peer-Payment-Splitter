import { PartialEqualSplitStrategy } from "../../../../../src/features/expenses/domain/partialEqualSplitStrategy.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import type {
  SplitStrategyContext,
  ParticipantShare,
} from "../../../../../src/features/expenses/domain/splitStrategy.js";

describe("PartialEqualSplitStrategy", () => {
  let strategy: PartialEqualSplitStrategy;

  beforeEach(() => {
    strategy = new PartialEqualSplitStrategy();
  });

  it("should split an amount equally among specified involved participants", () => {
    const context: SplitStrategyContext = {
      amount: 999,
      allGroupMemberIds: new Set(["user1", "user2", "user3", "user4", "user5"]),
      involvedParticipantIds: ["user2", "user4", "user1"],
    };

    const expectedShares: ParticipantShare[] = [
      { participantId: "user1", shareAmount: 333 },
      { participantId: "user2", shareAmount: 333 },
      { participantId: "user4", shareAmount: 333 },
    ];

    const actualShares = strategy.calculateShares(context);
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );

    expect(sortedActualShares).toEqual(expectedShares);
  });

  it("should distribute remainder deterministically among involved participants (sorted by ID)", () => {
    const context: SplitStrategyContext = {
      amount: 1000,
      allGroupMemberIds: new Set(["userA", "userB", "userC", "userD"]),
      involvedParticipantIds: ["userC", "userA"],
    };

    const actualShares = strategy.calculateShares(context);
    const expectedShares: ParticipantShare[] = [
      { participantId: "userA", shareAmount: 500 },
      { participantId: "userC", shareAmount: 500 },
    ];
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );

    expect(sortedActualShares).toEqual(expectedShares);
  });

  it("should distribute remainder (1 cent) deterministically among involved participants", () => {
    const context: SplitStrategyContext = {
      amount: 1001,
      allGroupMemberIds: new Set(["userA", "userB", "userC", "userD"]),
      involvedParticipantIds: ["userC", "userA", "userB"],
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

  it("should throw AppError if involvedParticipantIds is undefined", () => {
    const context: SplitStrategyContext = {
      amount: 100,
      allGroupMemberIds: new Set(["user1", "user2"]),
    };

    expect(() => strategy.calculateShares(context)).toThrow(
      new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description:
          "Involved participant IDs are required and cannot be empty for PARTIAL_EQUAL split.",
      })
    );
  });

  it("should throw AppError if involvedParticipantIds is empty", () => {
    const context: SplitStrategyContext = {
      amount: 100,
      allGroupMemberIds: new Set(["user1", "user2"]),
      involvedParticipantIds: [],
    };

    expect(() => strategy.calculateShares(context)).toThrow(
      new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description:
          "Involved participant IDs are required and cannot be empty for PARTIAL_EQUAL split.",
      })
    );
  });

  it("should use only unique participant IDs from involvedParticipantIds", () => {
    const context: SplitStrategyContext = {
      amount: 300,
      allGroupMemberIds: new Set(["user1", "user2", "user3"]),
      involvedParticipantIds: ["user1", "user2", "user1", "user2"],
    };

    const expectedShares: ParticipantShare[] = [
      { participantId: "user1", shareAmount: 150 },
      { participantId: "user2", shareAmount: 150 },
    ];

    const actualShares = strategy.calculateShares(context);
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );

    expect(sortedActualShares).toEqual(expectedShares);
  });

  it("should throw AppError via shareCalculator if an involved participant is not in allGroupMemberIds", () => {
    const context: SplitStrategyContext = {
      amount: 100,
      allGroupMemberIds: new Set(["user1", "user2"]),
      involvedParticipantIds: ["user1", "userX"],
    };

    expect(() => strategy.calculateShares(context)).toThrow(
      new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description:
          "Participant with ID userX (selected for splitting) is not a member of the group.",
      })
    );
  });

  it("should handle zero amount correctly for involved participants", () => {
    const context: SplitStrategyContext = {
      amount: 0,
      allGroupMemberIds: new Set(["user1", "user2", "user3"]),
      involvedParticipantIds: ["user1", "user3"],
    };

    const expectedShares: ParticipantShare[] = [
      { participantId: "user1", shareAmount: 0 },
      { participantId: "user3", shareAmount: 0 },
    ];

    const actualShares = strategy.calculateShares(context);
    const sortedActualShares = [...actualShares].sort((a, b) =>
      a.participantId.localeCompare(b.participantId)
    );

    expect(sortedActualShares).toEqual(expectedShares);
  });
});
