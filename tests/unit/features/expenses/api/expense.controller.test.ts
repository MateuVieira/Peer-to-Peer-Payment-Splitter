import { Request, Response, NextFunction } from "express";
import { ExpenseService } from "../../../../../src/features/expenses/application/expense.service.js";
import { createExpenseRouter } from "../../../../../src/features/expenses/api/expense.controller.js";
import { Expense, SplitType } from "../../../../../src/features/expenses/domain/expense.entity.js";
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

describe("Expense Controller", () => {
  let app: express.Application;
  let mockExpenseService: jest.Mocked<ExpenseService>;

  const mockUser1 = {
    id: "user-1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    updatedAt: new Date("2023-01-01T00:00:00.000Z"),
  };

  const mockUser2 = {
    id: "user-2",
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    updatedAt: new Date("2023-01-01T00:00:00.000Z"),
  };

  const mockGroup = {
    id: "group-1",
    name: "Test Group",
    description: "A test group",
    members: [mockUser1, mockUser2],
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    updatedAt: new Date("2023-01-01T00:00:00.000Z"),
  };

  const mockExpenseParticipant1 = {
    id: "participant-1",
    expenseId: "expense-1",
    participantId: "user-1",
    participant: mockUser1,
    shareAmount: 1000, // $10.00
  };

  const mockExpenseParticipant2 = {
    id: "participant-2",
    expenseId: "expense-1",
    participantId: "user-2",
    participant: mockUser2,
    shareAmount: 1000, // $10.00
  };

  const mockExpense: Expense = {
    id: "expense-1",
    description: "Test Expense",
    amount: 2000, // $20.00
    currency: "USD",
    expenseDate: new Date("2023-01-01T00:00:00.000Z"),
    splitType: SplitType.EQUAL,
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    updatedAt: new Date("2023-01-01T00:00:00.000Z"),
    groupId: "group-1",
    group: mockGroup,
    payerId: "user-1",
    payer: mockUser1,
    participants: [mockExpenseParticipant1, mockExpenseParticipant2],
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockExpenseService = {
      createExpense: jest.fn(),
      getExpenseById: jest.fn(),
      getExpensesByGroupId: jest.fn(),
      createMessageOfCreatedExpense: jest.fn(),
    } as unknown as jest.Mocked<ExpenseService>;

    app.use("/expenses", createExpenseRouter(mockExpenseService));

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

  describe("POST /expenses", () => {
    const createExpenseDto = {
      description: "New Expense",
      amount: 2000, // $20.00
      currency: "USD",
      expenseDate: new Date("2023-01-01T00:00:00.000Z"),
      splitType: SplitType.EQUAL,
      groupId: "group-1",
      payerId: "user-1",
      requestingUserId: "user-1",
    };

    it("should create a new expense and return 201 status with expense data", async () => {
      mockExpenseService.createExpense.mockResolvedValue(mockExpense);

      const response = await request(app).post("/expenses").send(createExpenseDto);

      expect(response.status).toBe(HttpCode.CREATED);
      expect(response.body).toEqual({
        ...mockExpense,
        expenseDate: mockExpense.expenseDate.toISOString(),
        createdAt: mockExpense.createdAt.toISOString(),
        updatedAt: mockExpense.updatedAt.toISOString(),
        group: {
          ...mockExpense.group,
          createdAt: mockExpense.group?.createdAt?.toISOString(),
          updatedAt: mockExpense.group?.updatedAt?.toISOString(),
          members: mockExpense.group?.members?.map((member) => ({
            ...member,
            createdAt: member.createdAt.toISOString(),
            updatedAt: member.updatedAt.toISOString(),
          })),
        },
        payer: {
          ...mockExpense.payer,
          createdAt: mockExpense.payer?.createdAt?.toISOString(),
          updatedAt: mockExpense.payer?.updatedAt?.toISOString(),
        },
        participants: mockExpense.participants.map((participant) => ({
          ...participant,
          participant: participant.participant
            ? {
                ...participant.participant,
                createdAt: participant.participant.createdAt?.toISOString(),
                updatedAt: participant.participant.updatedAt?.toISOString(),
              }
            : undefined,
        })),
      });

      expect(mockExpenseService.createExpense).toHaveBeenCalledTimes(1);
      const callArg = mockExpenseService.createExpense.mock.calls[0][0];
      expect(callArg.description).toBe(createExpenseDto.description);
      expect(callArg.amount).toBe(createExpenseDto.amount);
      expect(callArg.currency).toBe(createExpenseDto.currency);
      expect(callArg.splitType).toBe(createExpenseDto.splitType);
      expect(callArg.groupId).toBe(createExpenseDto.groupId);
      expect(callArg.payerId).toBe(createExpenseDto.payerId);
      expect(callArg.requestingUserId).toBe(createExpenseDto.requestingUserId);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Invalid expense data.",
      });

      mockExpenseService.createExpense.mockRejectedValue(error);

      const response = await request(app).post("/expenses").send(createExpenseDto);

      expect(response.status).toBe(HttpCode.BAD_REQUEST);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.BAD_REQUEST,
          message: "Invalid expense data.",
        },
      });
    });
  });

  describe("GET /expenses/:id", () => {
    const expenseId = "expense-1";

    it("should return an expense when found by ID with 200 status", async () => {
      mockExpenseService.getExpenseById.mockResolvedValue(mockExpense);

      const response = await request(app).get(`/expenses/${expenseId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        ...mockExpense,
        expenseDate: mockExpense.expenseDate.toISOString(),
        createdAt: mockExpense.createdAt.toISOString(),
        updatedAt: mockExpense.updatedAt.toISOString(),
        group: {
          ...mockExpense.group,
          createdAt: mockExpense.group?.createdAt?.toISOString(),
          updatedAt: mockExpense.group?.updatedAt?.toISOString(),
          members: mockExpense.group?.members?.map((member) => ({
            ...member,
            createdAt: member.createdAt.toISOString(),
            updatedAt: member.updatedAt.toISOString(),
          })),
        },
        payer: {
          ...mockExpense.payer,
          createdAt: mockExpense.payer?.createdAt?.toISOString(),
          updatedAt: mockExpense.payer?.updatedAt?.toISOString(),
        },
        participants: mockExpense.participants.map((participant) => ({
          ...participant,
          participant: participant.participant
            ? {
                ...participant.participant,
                createdAt: participant.participant.createdAt?.toISOString(),
                updatedAt: participant.participant.updatedAt?.toISOString(),
              }
            : undefined,
        })),
      });
      expect(mockExpenseService.getExpenseById).toHaveBeenCalledWith(expenseId);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Expense not found.",
      });

      mockExpenseService.getExpenseById.mockRejectedValue(error);

      const response = await request(app).get(`/expenses/${expenseId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "Expense not found.",
        },
      });
    });
  });

  describe("GET /expenses/group/:groupId", () => {
    const groupId = "group-1";

    it("should return expenses for a group with 200 status", async () => {
      mockExpenseService.getExpensesByGroupId.mockResolvedValue([mockExpense]);

      const response = await request(app).get(`/expenses/group/${groupId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual([
        {
          ...mockExpense,
          expenseDate: mockExpense.expenseDate.toISOString(),
          createdAt: mockExpense.createdAt.toISOString(),
          updatedAt: mockExpense.updatedAt.toISOString(),
          group: {
            ...mockExpense.group,
            createdAt: mockExpense.group?.createdAt?.toISOString(),
            updatedAt: mockExpense.group?.updatedAt?.toISOString(),
            members: mockExpense.group?.members?.map((member) => ({
              ...member,
              createdAt: member.createdAt.toISOString(),
              updatedAt: member.updatedAt.toISOString(),
            })),
          },
          payer: {
            ...mockExpense.payer,
            createdAt: mockExpense.payer?.createdAt?.toISOString(),
            updatedAt: mockExpense.payer?.updatedAt?.toISOString(),
          },
          participants: mockExpense.participants.map((participant) => ({
            ...participant,
            participant: participant.participant
              ? {
                  ...participant.participant,
                  createdAt: participant.participant.createdAt?.toISOString(),
                  updatedAt: participant.participant.updatedAt?.toISOString(),
                }
              : undefined,
          })),
        },
      ]);
      expect(mockExpenseService.getExpensesByGroupId).toHaveBeenCalledWith(groupId);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Group not found.",
      });

      mockExpenseService.getExpensesByGroupId.mockRejectedValue(error);

      const response = await request(app).get(`/expenses/group/${groupId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "Group not found.",
        },
      });
    });
  });
});
