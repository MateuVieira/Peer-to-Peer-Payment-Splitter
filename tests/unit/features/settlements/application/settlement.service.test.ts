import { SettlementService } from "../../../../../src/features/settlements/application/settlement.service.js";
import type {
  ISettlementRepository,
  CreateSettlementData,
} from "../../../../../src/features/settlements/domain/settlement.repository.js";
import type { IGroupRepository } from "../../../../../src/features/groups/domain/group.repository.js";
import type { User } from "../../../../../src/features/users/domain/user.entity.js";
import type { Group } from "../../../../../src/features/groups/domain/group.entity.js";
import type { Settlement } from "../../../../../src/features/settlements/domain/settlement.entity.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";

// Mock logger
jest.mock("../../../../../src/core/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("SettlementService - Integration Tests", () => {
  let settlementService: SettlementService;
  let mockSettlementRepository: jest.Mocked<ISettlementRepository>;
  let mockGroupRepository: jest.Mocked<IGroupRepository>;

  let mockPayer: User;
  let mockPayee: User;
  let mockOtherUser: User;
  let mockGroup: Group;

  beforeEach(() => {
    mockPayer = {
      id: "user_payer_id",
      name: "Payer User",
      email: "payer@test.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPayee = {
      id: "user_payee_id",
      name: "Payee User",
      email: "payee@test.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockOtherUser = {
      id: "user_other_id",
      name: "Other User",
      email: "other@test.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGroup = {
      id: "group1_id",
      name: "Test Group",
      description: "A group for testing settlements",
      members: [mockPayer, mockPayee, mockOtherUser],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSettlementRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByGroupId: jest.fn(),
      findByUserInGroup: jest.fn(),
    };

    mockGroupRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      findByName: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    settlementService = new SettlementService(mockSettlementRepository, mockGroupRepository);
  });

  describe("createSettlement", () => {
    it("should successfully create a settlement", async () => {
      const settlementDate = new Date();
      const createSettlementData: CreateSettlementData = {
        groupId: mockGroup.id,
        payerId: mockPayer.id,
        payeeId: mockPayee.id,
        amount: 5000,
        currency: "USD",
        settlementDate: new Date(),
      };

      const expectedSettlement: Settlement = {
        id: "settlement1_id",
        ...createSettlementData,
        currency: createSettlementData.currency!,
        createdAt: settlementDate,
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);
      mockSettlementRepository.create.mockResolvedValue(expectedSettlement);

      const result = await settlementService.createSettlement(createSettlementData);

      expect(result).toEqual(expectedSettlement);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.create).toHaveBeenCalledWith(createSettlementData);
    });

    it("should throw an error if group is not found", async () => {
      const nonExistentGroupId = "group_not_found_id";

      const createSettlementData: CreateSettlementData = {
        groupId: nonExistentGroupId,
        payerId: mockPayer.id,
        payeeId: mockPayee.id,
        amount: 5000,
        currency: "USD",
        settlementDate: new Date(),
      };

      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toThrow(
        AppError
      );

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toMatchObject({
        httpCode: HttpCode.NOT_FOUND,
        message: `Group with ID ${nonExistentGroupId} not found.`,
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(nonExistentGroupId);
      expect(mockSettlementRepository.create).not.toHaveBeenCalled();
    });

    it("should throw an error if payer is not in the group", async () => {
      const payerNotInGroup = { id: "payer_not_in_group_id", name: "Payer Not In Group" };
      const settlementDate = new Date();
      const createSettlementData: CreateSettlementData = {
        groupId: mockGroup.id,
        payerId: payerNotInGroup.id,
        payeeId: mockPayee.id,
        amount: 3000,
        currency: "USD",
        settlementDate: settlementDate,
      };

      const groupWithoutPayer = {
        ...mockGroup,
        members: [mockOtherUser, mockPayee],
      };

      mockGroupRepository.findById.mockResolvedValue(groupWithoutPayer);

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toThrow(
        AppError
      );

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message: "Payer is not a member of the specified group.",
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.create).not.toHaveBeenCalled();
    });

    it("should throw an error if payee is not in the group", async () => {
      const payeeNotInGroup = { id: "payee_not_in_group_id", name: "Payee Not In Group" };

      const settlementDate = new Date();

      const createSettlementData: CreateSettlementData = {
        groupId: mockGroup.id,
        payerId: mockPayer.id,
        payeeId: payeeNotInGroup.id,
        amount: 3000,
        currency: "USD",
        settlementDate: settlementDate,
      };

      const groupWithoutPayee = {
        ...mockGroup,
        members: [mockOtherUser, mockPayer],
      };

      mockGroupRepository.findById.mockResolvedValue(groupWithoutPayee);

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toThrow(
        AppError
      );

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message: "Payee is not a member of the specified group.",
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.create).not.toHaveBeenCalled();
    });

    it("should throw an error if payer and payee are the same user", async () => {
      const settlementDate = new Date();
      const createSettlementData: CreateSettlementData = {
        groupId: mockGroup.id,
        payerId: mockPayer.id,
        payeeId: mockPayer.id,
        amount: 3000,
        currency: "USD",
        settlementDate: settlementDate,
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toThrow(
        AppError
      );

      await expect(settlementService.createSettlement(createSettlementData)).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message: "Payer and payee cannot be the same user.",
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getSettlementById", () => {
    it("should return a settlement if the requesting user is in the group", async () => {
      const mockSettlement = {
        id: "settlement_id",
        groupId: mockGroup.id,
        payerId: mockPayer.id,
        payeeId: mockPayee.id,
        amount: 2000,
        currency: "USD",
        settlementDate: new Date(),
        createdAt: new Date(),
      };

      mockSettlementRepository.findById.mockResolvedValue(mockSettlement);
      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      const result = await settlementService.getSettlementById(mockSettlement.id);

      expect(result).toEqual(mockSettlement);
      expect(mockSettlementRepository.findById).toHaveBeenCalledWith(mockSettlement.id);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
    });

    it("should return null if settlement is not found", async () => {
      mockSettlementRepository.findById.mockResolvedValue(null);

      const result = await settlementService.getSettlementById("non_existent_id");

      expect(result).toBeNull();
      expect(mockSettlementRepository.findById).toHaveBeenCalledWith("non_existent_id");
      expect(mockGroupRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw an error if the group is not found", async () => {
      const mockSettlement = {
        id: "settlement_id",
        groupId: mockGroup.id,
        payerId: mockPayer.id,
        payeeId: mockPayee.id,
        amount: 2000,
        currency: "USD",
        settlementDate: new Date(),
        createdAt: new Date(),
      };

      mockSettlementRepository.findById.mockResolvedValue(mockSettlement);
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(settlementService.getSettlementById(mockSettlement.id)).rejects.toThrow(
        AppError
      );

      expect(mockSettlementRepository.findById).toHaveBeenCalledWith(mockSettlement.id);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
    });
  });

  describe("getSettlementsByGroupId", () => {
    it("should return settlements for a group if the requesting user is in the group", async () => {
      const mockSettlements: Settlement[] = [
        {
          id: "settlement_id_1",
          groupId: mockGroup.id,
          payerId: mockPayer.id,
          payeeId: mockPayee.id,
          amount: 2000,
          currency: "USD",
          settlementDate: new Date(),
          createdAt: new Date(),
        },
        {
          id: "settlement_id_2",
          groupId: mockGroup.id,
          payerId: mockPayee.id,
          payeeId: mockPayer.id,
          amount: 1000,
          currency: "USD",
          settlementDate: new Date(),
          createdAt: new Date(),
        },
      ];

      mockGroupRepository.findById.mockResolvedValue(mockGroup);
      mockSettlementRepository.findByGroupId.mockResolvedValue(mockSettlements);

      const result = await settlementService.getSettlementsByGroupId(mockGroup.id);

      expect(result).toEqual(mockSettlements);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.findByGroupId).toHaveBeenCalledWith(mockGroup.id);
    });

    it("should throw an error if the group is not found", async () => {
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(
        settlementService.getSettlementsByGroupId("non_existent_group_id")
      ).rejects.toThrow(AppError);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith("non_existent_group_id");
      expect(mockSettlementRepository.findByGroupId).not.toHaveBeenCalled();
    });
  });

  describe("getSettlementsForUserInGroup", () => {
    it("should return settlements for a user in a group if the requesting user is in the group", async () => {
      const mockSettlements: Settlement[] = [
        {
          id: "settlement_id_1",
          groupId: mockGroup.id,
          payerId: mockPayer.id,
          payeeId: mockPayee.id,
          amount: 2000,
          currency: "USD",
          settlementDate: new Date(),
          createdAt: new Date(),
        },
        {
          id: "settlement_id_2",
          groupId: mockGroup.id,
          payerId: mockPayee.id,
          payeeId: mockPayer.id,
          amount: 1000,
          currency: "USD",
          settlementDate: new Date(),
          createdAt: new Date(),
        },
      ];

      mockGroupRepository.findById.mockResolvedValue(mockGroup);
      mockSettlementRepository.findByUserInGroup.mockResolvedValue(mockSettlements);

      const result = await settlementService.getSettlementsForUserInGroup(
        mockPayer.id,
        mockGroup.id
      );

      expect(result).toEqual(mockSettlements);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.findByUserInGroup).toHaveBeenCalledWith(
        mockPayer.id,
        mockGroup.id
      );
    });

    it("should throw an error if the group is not found", async () => {
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(
        settlementService.getSettlementsForUserInGroup(mockPayer.id, "non_existent_group_id")
      ).rejects.toThrow(AppError);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith("non_existent_group_id");
      expect(mockSettlementRepository.findByUserInGroup).not.toHaveBeenCalled();
    });

    it("should throw an error if the target user is not in the group", async () => {
      const userNotInGroup = { id: "user_not_in_group_id", name: "User Not In Group" };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      await expect(
        settlementService.getSettlementsForUserInGroup(userNotInGroup.id, mockGroup.id)
      ).rejects.toMatchObject({
        httpCode: HttpCode.BAD_REQUEST,
        message: `User ${userNotInGroup.id} is not a member of group ${mockGroup.id}.`,
      });

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(mockGroup.id);
      expect(mockSettlementRepository.findByUserInGroup).not.toHaveBeenCalled();
    });
  });
});
