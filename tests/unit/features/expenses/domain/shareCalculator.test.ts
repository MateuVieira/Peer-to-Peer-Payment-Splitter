import { calculateShares } from "../../../../../src/features/expenses/domain/shareCalculator.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import type { ParticipantShare } from "../../../../../src/features/expenses/domain/splitStrategy.js"; // For expected type

describe("shareCalculator", () => {
  describe("calculateShares", () => {
    it("should split an amount equally among participants with no remainder", () => {
      const amount = 1000;
      const selectedParticipantIds = ["user1", "user2", "user3", "user4"];
      const allGroupMemberIds = new Set(selectedParticipantIds);

      const expectedShares: ParticipantShare[] = [
        { participantId: "user1", shareAmount: 250 },
        { participantId: "user2", shareAmount: 250 },
        { participantId: "user3", shareAmount: 250 },
        { participantId: "user4", shareAmount: 250 },
      ];

      const actualShares = calculateShares(selectedParticipantIds, amount, allGroupMemberIds);

      const sortedActualShares = [...actualShares].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );

      expect(sortedActualShares).toEqual(expectedShares);
    });

    it("should distribute remainder deterministically (sorted by ID)", () => {
      const amount = 1001;
      const selectedParticipantIds = ["userC", "userA", "userB"];
      const allGroupMemberIds = new Set(selectedParticipantIds);

      const expectedShares: ParticipantShare[] = [
        { participantId: "userA", shareAmount: 334 },
        { participantId: "userB", shareAmount: 334 },
        { participantId: "userC", shareAmount: 333 },
      ];

      const actualShares = calculateShares(selectedParticipantIds, amount, allGroupMemberIds);

      const sortedActualShares = [...actualShares].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );

      expect(sortedActualShares).toEqual(expectedShares);
    });

    it("should handle a single participant", () => {
      const amount = 500;
      const selectedParticipantIds = ["user1"];
      const allGroupMemberIds = new Set(selectedParticipantIds);
      const expectedShares: ParticipantShare[] = [{ participantId: "user1", shareAmount: 500 }];

      const actualShares = calculateShares(selectedParticipantIds, amount, allGroupMemberIds);

      expect(actualShares).toEqual(expectedShares);
    });

    it("should handle zero amount", () => {
      const amount = 0;
      const selectedParticipantIds = ["user1", "user2"];
      const allGroupMemberIds = new Set(selectedParticipantIds);

      const expectedShares: ParticipantShare[] = [
        { participantId: "user1", shareAmount: 0 },
        { participantId: "user2", shareAmount: 0 },
      ];

      const actualShares = calculateShares(selectedParticipantIds, amount, allGroupMemberIds);

      const sortedActualShares = [...actualShares].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );

      expect(sortedActualShares).toEqual(expectedShares);
    });

    it("should throw AppError if selectedParticipantIds is empty", () => {
      const amount = 100;
      const selectedParticipantIds: string[] = [];
      const allGroupMemberIds = new Set(["user1"]);

      expect(() => calculateShares(selectedParticipantIds, amount, allGroupMemberIds)).toThrow(
        new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "Cannot calculate shares for zero participants.",
        })
      );
    });

    it("should throw AppError if a selected participant is not in allGroupMemberIds", () => {
      const amount = 100;
      const selectedParticipantIds = ["user1", "userX"];
      const allGroupMemberIds = new Set(["user1", "user2"]);

      expect(() => calculateShares(selectedParticipantIds, amount, allGroupMemberIds)).toThrow(
        new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description:
            "Participant with ID userX (selected for splitting) is not a member of the group.",
        })
      );
    });

    it("should correctly handle amount less than number of participants (e.g. 1 cent for 2 people)", () => {
      const amount = 1;
      const selectedParticipantIds = ["userB", "userA"];
      const allGroupMemberIds = new Set(selectedParticipantIds);

      const expectedShares: ParticipantShare[] = [
        { participantId: "userA", shareAmount: 1 },
        { participantId: "userB", shareAmount: 0 },
      ];

      const actualShares = calculateShares(selectedParticipantIds, amount, allGroupMemberIds);

      const sortedActualShares = [...actualShares].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );

      expect(sortedActualShares).toEqual(expectedShares);
    });
  });
});
