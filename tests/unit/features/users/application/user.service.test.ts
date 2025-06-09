import { UserService } from "../../../../../src/features/users/application/user.service.js";
import { IUserRepository } from "../../../../../src/features/users/domain/user.repository.js";
import { User } from "../../../../../src/features/users/domain/user.entity.js";
import {
  CreateUserDto,
  UpdateUserDto,
} from "../../../../../src/features/users/application/user.service.js"; // DTOs are exported from service file
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";

jest.mock("../../../../../src/core/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("UserService", () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    userService = new UserService(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    const createUserDto: CreateUserDto = {
      name: "Test User",
      email: "test@example.com",
    };

    const mockUser: User = {
      id: "user-1",
      ...createUserDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should create and return a user if email does not exist", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
    });

    it("should throw AppError CONFLICT if user with email already exists", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(userService.createUser(createUserDto)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.CONFLICT,
          description: "User with this email already exists.",
        })
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getUserById", () => {
    const userId = "user-1";

    const mockUser: User = {
      id: userId,
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return a user when found by ID", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it("should throw AppError NOT_FOUND if user is not found by ID", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(userId)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: "User not found.",
        })
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe("getUserByEmail", () => {
    const userEmail = "test@example.com";

    const mockUser: User = {
      id: "user-1",
      name: "Test User",
      email: userEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return a user when found by email", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail(userEmail);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userEmail);
    });

    it("should throw AppError NOT_FOUND if user is not found by email", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.getUserByEmail(userEmail)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: "User not found.",
        })
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userEmail);
    });
  });

  describe("updateUser", () => {
    const userId = "user-1";

    const originalUser: User = {
      id: userId,
      name: "Original Name",
      email: "original@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should update and return the user if found and data is valid", async () => {
      const updateData: UpdateUserDto = { name: "New Name" };
      const expectedUpdatedUser: User = {
        ...originalUser,
        ...updateData,
        updatedAt: new Date(),
      };

      mockUserRepository.findById.mockResolvedValue(originalUser);
      mockUserRepository.update.mockResolvedValue(expectedUpdatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(expectedUpdatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
    });

    it("should return original user if updateData provides no actual changes", async () => {
      const updateData: UpdateUserDto = { name: originalUser.name };
      mockUserRepository.findById.mockResolvedValue(originalUser);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(originalUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should return original user if updateData is empty", async () => {
      const updateData: UpdateUserDto = {};
      mockUserRepository.findById.mockResolvedValue(originalUser);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(originalUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should throw AppError NOT_FOUND if user to update is not found", async () => {
      const updateData: UpdateUserDto = { name: "Any Name" };
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: "User not found.",
        })
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should throw AppError INTERNAL_SERVER_ERROR if repository update fails", async () => {
      const updateData: UpdateUserDto = { name: "New Name For Failing Update" };
      mockUserRepository.findById.mockResolvedValue(originalUser);
      mockUserRepository.update.mockResolvedValue(null);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: "Failed to update user.",
        })
      );

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
    });
  });

  describe("deleteUser", () => {
    const userId = "user-1";

    const mockUser: User = {
      id: userId,
      name: "User To Delete",
      email: "delete@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should successfully delete a user", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      await userService.deleteUser(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it("should throw AppError NOT_FOUND if user to delete is not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser(userId)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: "User not found. Cannot delete.",
        })
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw AppError INTERNAL_SERVER_ERROR if repository delete throws an error", async () => {
      const deleteError = new Error("Database delete failed");
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockRejectedValue(deleteError);

      await expect(userService.deleteUser(userId)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: "Failed to delete user due to an unexpected error.",
        })
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });
  });
});
