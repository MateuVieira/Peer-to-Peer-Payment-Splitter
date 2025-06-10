import { Request, Response, NextFunction } from "express";
import { UserService } from "../../../../../src/features/users/application/user.service.js";
import { createUserRouter } from "../../../../../src/features/users/api/user.controller.js";
import { User } from "../../../../../src/features/users/domain/user.entity.js";
import {
  CreateUserDto,
  UpdateUserDto,
} from "../../../../../src/features/users/application/user.service.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import request from "supertest";
import express from "express";
import { validateRequest } from "../../../../../src/core/index.js";
import {
  CreateUserSchema,
  UpdateUserSchema,
} from "../../../../../src/features/users/application/index.js";

jest.mock("../../../../../src/core/index.js", () => ({
  validateRequest: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock("../../../../../src/core/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const createMockDate = () => new Date("2023-01-01T00:00:00.000Z");

describe("User Controller", () => {
  let app: express.Application;
  let mockUserService: jest.Mocked<UserService>;

  const mockUser: User = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    createdAt: createMockDate(),
    updatedAt: createMockDate(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockUserService = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    app.use("/users", createUserRouter(mockUserService));

    // Add a custom error handler as the last middleware
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
      if (err instanceof AppError) {
        res.status(err.httpCode).json({
          error: {
            statusCode: err.httpCode,
            message: err.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            statusCode: 500,
            message: err instanceof Error ? err.message : "Internal Server Error",
          },
        });
      }
    };

    app.use(errorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /users", () => {
    const createUserDto: CreateUserDto = {
      name: "Test User",
      email: "test@example.com",
    };

    it("should create a new user and return 201 status with user data", async () => {
      mockUserService.createUser.mockResolvedValue({
        ...mockUser,
        createdAt: createMockDate(),
        updatedAt: createMockDate(),
      });

      const response = await request(app).post("/users").send(createUserDto);

      expect(response.status).toBe(HttpCode.CREATED);
      expect(response.body).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
      expect(mockUserService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(validateRequest).toHaveBeenCalledWith(CreateUserSchema);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.CONFLICT,
        description: "User with this email already exists.",
      });
      mockUserService.createUser.mockRejectedValue(error);

      const response = await request(app).post("/users").send(createUserDto);

      expect(response.status).toBe(HttpCode.CONFLICT);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.CONFLICT,
          message: "User with this email already exists.",
        },
      });
    });
  });

  describe("GET /users/:id", () => {
    const userId = "user-1";

    it("should return a user when found by ID with 200 status", async () => {
      mockUserService.getUserById.mockResolvedValue({
        ...mockUser,
        createdAt: createMockDate(),
        updatedAt: createMockDate(),
      });

      const response = await request(app).get(`/users/${userId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
    });

    it("should return 400 if ID is missing", async () => {
      const response = await request(app).get("/users/");

      expect(response.status).toBe(404);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found.",
      });
      mockUserService.getUserById.mockRejectedValue(error);

      const response = await request(app).get(`/users/${userId}`);

      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "User not found.",
        },
      });
    });
  });

  describe("GET /users/email/:email", () => {
    const userEmail = "test@example.com";

    it("should return a user when found by email with 200 status", async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        ...mockUser,
        createdAt: createMockDate(),
        updatedAt: createMockDate(),
      });

      const response = await request(app).get(`/users/email/${userEmail}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(userEmail);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found.",
      });
      mockUserService.getUserByEmail.mockRejectedValue(error);

      const response = await request(app).get(`/users/email/${userEmail}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "User not found.",
        },
      });
    });
  });

  describe("PATCH /users/:id", () => {
    const userId = "user-1";
    const updateUserDto: UpdateUserDto = {
      name: "Updated User Name",
    };

    it("should update a user and return 200 status with updated user data", async () => {
      const updatedUser = {
        ...mockUser,
        name: "Updated User Name",
        createdAt: createMockDate(),
        updatedAt: createMockDate(),
      };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const response = await request(app).patch(`/users/${userId}`).send(updateUserDto);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      });
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, updateUserDto);
      expect(validateRequest).toHaveBeenCalledWith(UpdateUserSchema);
    });

    it("should return 400 if ID is missing", async () => {
      const response = await request(app).patch("/users/").send(updateUserDto);

      expect(response.status).toBe(404);
    });

    it("should return 400 if update data is empty", async () => {
      const response = await request(app).patch(`/users/${userId}`).send({});

      expect(response.status).toBe(HttpCode.BAD_REQUEST);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.BAD_REQUEST,
          message:
            "No update data provided. At least one field (name) must be specified for update.",
        },
      });
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found.",
      });
      mockUserService.updateUser.mockRejectedValue(error);

      const response = await request(app).patch(`/users/${userId}`).send(updateUserDto);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "User not found.",
        },
      });
    });
  });

  describe("DELETE /users/:id", () => {
    const userId = "user-1";

    it("should delete a user and return 204 status with no content", async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);

      const response = await request(app).delete(`/users/${userId}`);

      expect(response.status).toBe(HttpCode.NO_CONTENT);
      expect(response.body).toEqual({});
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it("should return 400 if ID is missing", async () => {
      const response = await request(app).delete("/users/");

      expect(response.status).toBe(404);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found. Cannot delete.",
      });
      mockUserService.deleteUser.mockRejectedValue(error);

      const response = await request(app).delete(`/users/${userId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "User not found. Cannot delete.",
        },
      });
    });
  });
});
