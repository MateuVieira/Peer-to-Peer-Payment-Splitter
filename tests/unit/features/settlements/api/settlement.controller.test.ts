import { Request, Response, NextFunction } from "express";
import { SettlementService } from "../../../../../src/features/settlements/application/settlement.service.js";
import { createSettlementRouter } from "../../../../../src/features/settlements/api/settlement.controller.js";
import { Settlement } from "../../../../../src/features/settlements/domain/settlement.entity.js";
import { CreateSettlementDto } from "../../../../../src/features/settlements/application/settlement.schemas.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import request from "supertest";
import express from "express";

// Mock the Prisma client
jest.mock("../../../../../src/core/database/prisma.client.js", () => ({
  __esModule: true,
  default: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock("../../../../../src/core/middleware/validation.middleware.js", () => ({
  validateRequest: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
  validateParams: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock("../../../../../src/core/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("Settlement Controller", () => {
  let app: express.Application;
  let mockSettlementService: jest.Mocked<SettlementService>;

  const mockSettlement: Settlement = {
    id: "settlement-1",
    groupId: "group-1",
    payerId: "user-1",
    payeeId: "user-2",
    amount: 100,
    currency: "USD",
    settlementDate: new Date("2023-01-01T00:00:00.000Z"),
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockSettlementService = {
      createSettlement: jest.fn(),
      getSettlementById: jest.fn(),
      getSettlementsByGroupId: jest.fn(),
      getSettlementsForUserInGroup: jest.fn(),
    } as unknown as jest.Mocked<SettlementService>;

    app.use("/settlements", createSettlementRouter(mockSettlementService));

    // Add error handling middleware
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  describe("POST /settlements", () => {
    const createSettlementDto: CreateSettlementDto = {
      groupId: "group-1",
      payerId: "user-1",
      payeeId: "user-2",
      amount: 100,
      currency: "USD",
    };

    it("should create a new settlement and return 201 status with settlement data", async () => {
      mockSettlementService.createSettlement.mockResolvedValue(mockSettlement);

      const response = await request(app).post("/settlements").send(createSettlementDto);

      expect(response.status).toBe(HttpCode.CREATED);
      expect(response.body).toEqual({
        ...mockSettlement,
        createdAt: mockSettlement.createdAt.toISOString(),
        settlementDate: mockSettlement.settlementDate.toISOString(),
      });
      expect(mockSettlementService.createSettlement).toHaveBeenCalledWith({
        ...createSettlementDto,
        settlementDate: expect.any(Date),
      });
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.CONFLICT,
        description: "Settlement already exists.",
      });

      mockSettlementService.createSettlement.mockRejectedValue(error);

      const response = await request(app).post("/settlements").send(createSettlementDto);

      expect(response.status).toBe(HttpCode.CONFLICT);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.CONFLICT,
          message: "Settlement already exists.",
        },
      });
    });
  });

  describe("GET /settlements/:id", () => {
    const settlementId = "settlement-1";

    it("should return a settlement when found by ID with 200 status", async () => {
      mockSettlementService.getSettlementById.mockResolvedValue(mockSettlement);

      const response = await request(app).get(`/settlements/${settlementId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        ...mockSettlement,
        createdAt: mockSettlement.createdAt.toISOString(),
        settlementDate: mockSettlement.settlementDate.toISOString(),
      });
      expect(mockSettlementService.getSettlementById).toHaveBeenCalledWith(settlementId);
    });

    it("should return 400 if ID is missing", async () => {
      const response = await request(app).get("/settlements/");

      expect(response.status).toBe(404);
    });

    it("should return 404 if settlement is not found", async () => {
      mockSettlementService.getSettlementById.mockResolvedValue(null);

      const response = await request(app).get(`/settlements/${settlementId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: `Settlement with ID ${settlementId} not found or not accessible by user.`,
        },
      });
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Settlement not found.",
      });

      mockSettlementService.getSettlementById.mockRejectedValue(error);

      const response = await request(app).get(`/settlements/${settlementId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "Settlement not found.",
        },
      });
    });
  });

  describe("GET /settlements/group/:groupId", () => {
    const groupId = "group-1";
    const mockSettlements = [mockSettlement];

    it("should return settlements for a group with 200 status", async () => {
      mockSettlementService.getSettlementsByGroupId.mockResolvedValue(mockSettlements);

      const response = await request(app).get(`/settlements/group/${groupId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual([
        {
          ...mockSettlement,
          createdAt: mockSettlement.createdAt.toISOString(),
          settlementDate: mockSettlement.settlementDate.toISOString(),
        },
      ]);
      expect(mockSettlementService.getSettlementsByGroupId).toHaveBeenCalledWith(groupId);
    });

    it("should return 400 if group ID is missing", async () => {
      const response = await request(app).get("/settlements/group/");

      expect(response.status).toBe(404);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Group not found.",
      });

      mockSettlementService.getSettlementsByGroupId.mockRejectedValue(error);

      const response = await request(app).get(`/settlements/group/${groupId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "Group not found.",
        },
      });
    });
  });

  describe("GET /settlements/user/:userId/group/:groupId", () => {
    const userId = "user-1";
    const groupId = "group-1";
    const mockSettlements = [mockSettlement];

    it("should return settlements for a user in a group with 200 status", async () => {
      mockSettlementService.getSettlementsForUserInGroup.mockResolvedValue(mockSettlements);

      const response = await request(app).get(`/settlements/user/${userId}/group/${groupId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual([
        {
          ...mockSettlement,
          createdAt: mockSettlement.createdAt.toISOString(),
          settlementDate: mockSettlement.settlementDate.toISOString(),
        },
      ]);
      expect(mockSettlementService.getSettlementsForUserInGroup).toHaveBeenCalledWith(
        userId,
        groupId
      );
    });

    it("should return 400 if user ID is missing", async () => {
      const response = await request(app).get(`/settlements/user//group/${groupId}`);

      expect(response.status).toBe(404);
    });

    it("should return 400 if group ID is missing", async () => {
      const response = await request(app).get(`/settlements/user/${userId}/group/`);

      expect(response.status).toBe(404);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User or group not found.",
      });

      mockSettlementService.getSettlementsForUserInGroup.mockRejectedValue(error);

      const response = await request(app).get(`/settlements/user/${userId}/group/${groupId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "User or group not found.",
        },
      });
    });
  });
});
