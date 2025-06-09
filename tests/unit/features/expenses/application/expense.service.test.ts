import { ExpenseService } from "../../../../../src/features/expenses/application/expense.service.js";
import type {
  IExpenseRepository,
  CreateExpenseData,
} from "../../../../../src/features/expenses/domain/expense.repository.js";
import type { IGroupRepository } from "../../../../../src/features/groups/domain/group.repository.js";
import type { Group } from "../../../../../src/features/groups/domain/group.entity.js";
import type { User } from "../../../../../src/features/users/domain/user.entity.js";
import { SplitType } from "../../../../../src/features/expenses/domain/expense.entity.js";
import type { Expense } from "../../../../../src/features/expenses/domain/expense.entity.js";
import type { CreateExpenseDto } from "../../../../../src/features/expenses/application/expense.schemas.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import { UserService } from "../../../../../src/features/users/application/user.service.js";

jest.mock("../../../../../src/core/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("ExpenseService - Integration Tests", () => {
  let expenseService: ExpenseService;
  let mockExpenseRepository: jest.Mocked<IExpenseRepository>;
  let mockGroupRepository: jest.Mocked<IGroupRepository>;

  beforeEach(() => {
    mockExpenseRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByGroupId: jest.fn(),
    };
    mockGroupRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    // Mock producer service
    const mockProducerService = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    // Mock user service
    const mockUserService = {
      userRepository: {},
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as UserService;

    expenseService = new ExpenseService(
      mockExpenseRepository,
      mockGroupRepository,
      mockProducerService,
      mockUserService
    );
  });

  describe("createExpense", () => {
    const requestingUserId = "user1_id";

    const mockPayer: User = {
      id: requestingUserId,
      name: "Payer Name",
      email: "payer@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockMember2: User = {
      id: "user2_id",
      name: "Member Two",
      email: "member2@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockMember3: User = {
      id: "user3_id",
      name: "Member Three",
      email: "member3@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockGroup: Group = {
      id: "group1_id",
      name: "Test Group",
      description: "A test group",
      members: [mockPayer, mockMember2, mockMember3],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should successfully create an expense with EQUAL split", async () => {
      const testDate = new Date();

      const createExpenseDto: CreateExpenseDto = {
        description: "Dinner",
        amount: 3000, // 30.00
        payerId: mockPayer.id,
        groupId: mockGroup.id,
        splitType: SplitType.EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        currency: "USD",
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      mockExpenseRepository.create.mockImplementation(
        (data: CreateExpenseData): Promise<Expense> => {
          return Promise.resolve({
            id: "expense1_id",
            description: data.description,
            amount: data.amount,
            currency: data.currency || "USD",
            payerId: data.payerId,
            groupId: data.groupId,
            splitType: data.splitType!,
            expenseDate: data.expenseDate,
            participants: data.participants.map((p, index) => ({
              id: `ep${index + 1}`,
              expenseId: "expense1_id",
              participantId: p.participantId,
              shareAmount: p.shareAmount,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      );

      const result = await expenseService.createExpense(createExpenseDto);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).toHaveBeenCalledTimes(1);

      const createCallArgs = mockExpenseRepository.create.mock.calls[0]![0];
      expect(createCallArgs.amount).toBe(3000);
      expect(createCallArgs.payerId).toBe(mockPayer.id);
      expect(createCallArgs.groupId).toBe(mockGroup.id);
      expect(createCallArgs.splitType).toBe(SplitType.EQUAL);
      expect(createCallArgs.expenseDate).toEqual(testDate);

      const expectedRepoParticipants = [
        { participantId: "user1_id", shareAmount: 1000 },
        { participantId: "user2_id", shareAmount: 1000 },
        { participantId: "user3_id", shareAmount: 1000 },
      ].sort((a, b) => a.participantId.localeCompare(b.participantId));

      const actualRepoParticipants = [...createCallArgs.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(actualRepoParticipants).toEqual(expectedRepoParticipants);

      expect(result.amount).toBe(3000);
      expect(result.payerId).toBe(mockPayer.id);
      expect(result.groupId).toBe(mockGroup.id);
      expect(result.splitType).toBe(SplitType.EQUAL);

      const actualResultParticipants = [...result.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(
        actualResultParticipants.map((p) => ({
          participantId: p.participantId,
          shareAmount: p.shareAmount,
        }))
      ).toEqual(expectedRepoParticipants);
    });

    it("should successfully create an expense with EQUAL split and distribute remainder", async () => {
      const testDate = new Date();
      const createExpenseDto: CreateExpenseDto = {
        description: "Snacks",
        amount: 1000,
        payerId: mockPayer.id,
        groupId: mockGroup.id,
        splitType: SplitType.EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        currency: "USD",
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      mockExpenseRepository.create.mockImplementation(
        (data: CreateExpenseData): Promise<Expense> => {
          return Promise.resolve({
            id: "expense2_id",
            description: data.description,
            amount: data.amount,
            currency: data.currency || "USD",
            payerId: data.payerId,
            groupId: data.groupId,
            splitType: data.splitType!,
            expenseDate: data.expenseDate,
            participants: data.participants.map((p, index) => ({
              id: `ep_rem_${index + 1}`,
              expenseId: "expense2_id",
              participantId: p.participantId,
              shareAmount: p.shareAmount,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      );

      const result = await expenseService.createExpense(createExpenseDto);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).toHaveBeenCalledTimes(1);

      const createCallArgs = mockExpenseRepository.create.mock.calls[0]![0];
      expect(createCallArgs.amount).toBe(1000);
      expect(createCallArgs.payerId).toBe(mockPayer.id);

      const expectedRepoParticipants = [
        { participantId: "user1_id", shareAmount: 334 },
        { participantId: "user2_id", shareAmount: 333 },
        { participantId: "user3_id", shareAmount: 333 },
      ].sort((a, b) => a.participantId.localeCompare(b.participantId));

      const actualRepoParticipants = [...createCallArgs.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(actualRepoParticipants).toEqual(expectedRepoParticipants);

      expect(result.amount).toBe(1000);
      expect(result.payerId).toBe(mockPayer.id);
      expect(result.splitType).toBe(SplitType.EQUAL);

      const actualResultParticipants = [...result.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(
        actualResultParticipants.map((p) => ({
          participantId: p.participantId,
          shareAmount: p.shareAmount,
        }))
      ).toEqual(expectedRepoParticipants);
    });

    it("should successfully create an expense with PARTIAL_EQUAL split", async () => {
      const testDate = new Date();
      const createExpenseDto: CreateExpenseDto = {
        description: "Shared Software Subscription",
        amount: 2000,
        payerId: mockPayer.id,
        groupId: mockGroup.id,
        splitType: SplitType.PARTIAL_EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        involvedParticipantIds: [mockMember2.id, mockMember3.id],
        currency: "USD",
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      mockExpenseRepository.create.mockImplementation(
        (data: CreateExpenseData): Promise<Expense> => {
          return Promise.resolve({
            id: "expense3_id",
            description: data.description,
            amount: data.amount,
            currency: data.currency || "USD",
            payerId: data.payerId,
            groupId: data.groupId,
            splitType: data.splitType!,
            expenseDate: data.expenseDate,
            participants: data.participants.map((p, index) => ({
              id: `ep_partial_${index + 1}`,
              expenseId: "expense3_id",
              participantId: p.participantId,
              shareAmount: p.shareAmount,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      );

      const result = await expenseService.createExpense(createExpenseDto);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).toHaveBeenCalledTimes(1);

      const createCallArgs = mockExpenseRepository.create.mock.calls[0]![0];
      expect(createCallArgs.amount).toBe(2000);
      expect(createCallArgs.payerId).toBe(mockPayer.id);
      expect(createCallArgs.splitType).toBe(SplitType.PARTIAL_EQUAL);

      const expectedRepoParticipants = [
        { participantId: mockMember2.id, shareAmount: 1000 },
        { participantId: mockMember3.id, shareAmount: 1000 },
      ].sort((a, b) => a.participantId.localeCompare(b.participantId));

      const actualRepoParticipants = [...createCallArgs.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(actualRepoParticipants).toEqual(expectedRepoParticipants);

      expect(result.amount).toBe(2000);
      expect(result.payerId).toBe(mockPayer.id);
      expect(result.splitType).toBe(SplitType.PARTIAL_EQUAL);

      const actualResultParticipants = [...result.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(
        actualResultParticipants.map((p) => ({
          participantId: p.participantId,
          shareAmount: p.shareAmount,
        }))
      ).toEqual(expectedRepoParticipants);
    });

    it("should successfully create an expense with PARTIAL_EQUAL split and distribute remainder", async () => {
      const testDate = new Date();
      const createExpenseDto: CreateExpenseDto = {
        description: "Team Lunch Extras",
        amount: 1001,
        payerId: mockPayer.id,
        groupId: mockGroup.id,
        splitType: SplitType.PARTIAL_EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        involvedParticipantIds: [mockMember2.id, mockMember3.id],
        currency: "USD",
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      mockExpenseRepository.create.mockImplementation(
        (data: CreateExpenseData): Promise<Expense> => {
          return Promise.resolve({
            id: "expense4_id",
            description: data.description,
            amount: data.amount,
            currency: data.currency || "USD",
            payerId: data.payerId,
            groupId: data.groupId,
            splitType: data.splitType!,
            expenseDate: data.expenseDate,
            participants: data.participants.map((p, index) => ({
              id: `ep_partial_rem_${index + 1}`,
              expenseId: "expense4_id",
              participantId: p.participantId,
              shareAmount: p.shareAmount,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      );

      const result = await expenseService.createExpense(createExpenseDto);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).toHaveBeenCalledTimes(1);

      const createCallArgs = mockExpenseRepository.create.mock.calls[0]![0];
      expect(createCallArgs.amount).toBe(1001);
      expect(createCallArgs.payerId).toBe(mockPayer.id);
      expect(createCallArgs.splitType).toBe(SplitType.PARTIAL_EQUAL);

      const expectedRepoParticipants = [
        { participantId: mockMember2.id, shareAmount: 501 },
        { participantId: mockMember3.id, shareAmount: 500 },
      ].sort((a, b) => a.participantId.localeCompare(b.participantId));

      const actualRepoParticipants = [...createCallArgs.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(actualRepoParticipants).toEqual(expectedRepoParticipants);

      expect(result.amount).toBe(1001);
      expect(result.payerId).toBe(mockPayer.id);
      expect(result.splitType).toBe(SplitType.PARTIAL_EQUAL);

      const actualResultParticipants = [...result.participants].sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      );
      expect(
        actualResultParticipants.map((p) => ({
          participantId: p.participantId,
          shareAmount: p.shareAmount,
        }))
      ).toEqual(expectedRepoParticipants);
    });

    it("should throw an error if the group is not found", async () => {
      const testDate = new Date();
      const nonExistentGroupId = "non_existent_group_id";

      const createExpenseDto: CreateExpenseDto = {
        description: "Non-existent group expense",
        amount: 1000,
        payerId: mockPayer.id,
        groupId: nonExistentGroupId,
        splitType: SplitType.EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        currency: "USD",
      };

      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toThrow(AppError);

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toMatchObject({
        httpCode: HttpCode.NOT_FOUND,
        message: `Group with ID ${createExpenseDto.groupId} not found.`,
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(nonExistentGroupId);
      expect(mockExpenseRepository.create).not.toHaveBeenCalled();
    });

    it("should throw an error if the payer is not a member of the group", async () => {
      const nonMemberPayerId = "user_not_in_group_id";
      const testDate = new Date();

      const createExpenseDto: CreateExpenseDto = {
        description: "Payer not in group expense",
        amount: 1000,
        payerId: nonMemberPayerId,
        groupId: mockGroup.id,
        splitType: SplitType.EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        currency: "USD",
      };

      mockGroupRepository.findById.mockResolvedValue({
        ...mockGroup,
        members: [mockPayer, mockMember2],
      });

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toThrow(AppError);

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message: `Payer with ID ${nonMemberPayerId} is not a member of the group.`,
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).not.toHaveBeenCalled();
    });

    it("should throw an error if an involved participant (PARTIAL_EQUAL) is not a member of the group", async () => {
      const nonMemberParticipantId = "user_not_in_group_for_partial_split_id";
      const testDate = new Date();

      const createExpenseDto: CreateExpenseDto = {
        description: "Involved participant not in group expense",
        amount: 1000,
        payerId: mockPayer.id,
        groupId: mockGroup.id,
        splitType: SplitType.PARTIAL_EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        currency: "USD",
        involvedParticipantIds: [mockMember2.id, nonMemberParticipantId],
      };

      mockGroupRepository.findById.mockResolvedValue({
        ...mockGroup,
        members: [mockPayer, mockMember2, mockMember3],
      });

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toThrow(AppError);

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message: `Participant with ID ${nonMemberParticipantId} (selected for splitting) is not a member of the group.`,
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).not.toHaveBeenCalled();
    });

    it("should throw an error if involvedParticipantIds is empty for PARTIAL_EQUAL split", async () => {
      const testDate = new Date();
      const createExpenseDto: CreateExpenseDto = {
        description: "Empty involved participants expense",
        amount: 1000,
        payerId: mockPayer.id,
        groupId: mockGroup.id,
        splitType: SplitType.PARTIAL_EQUAL,
        expenseDate: testDate,
        requestingUserId: requestingUserId,
        currency: "USD",
        involvedParticipantIds: [],
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toThrow(AppError);

      await expect(expenseService.createExpense(createExpenseDto)).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message:
          "Involved participant IDs are required and cannot be empty for PARTIAL_EQUAL split.",
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockExpenseRepository.create).not.toHaveBeenCalled();
    });
  });
});
