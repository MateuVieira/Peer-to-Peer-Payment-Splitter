import { Request, Response, NextFunction } from "express";
import { GroupService } from "../../../../../src/features/groups/application/group.service.js";
import { createGroupRouter } from "../../../../../src/features/groups/api/group.controller.js";
import { Group } from "../../../../../src/features/groups/domain/group.entity.js";
import {
  CreateGroup,
  UpdateGroupMember,
  UpdateGroupDto,
} from "../../../../../src/features/groups/application/group.service.js";
import { AppError, HttpCode } from "../../../../../src/core/error/app.error.js";
import request from "supertest";
import express from "express";

jest.mock("../../../../../src/core/container.ts", () => ({
  groupService: {
    getGroups: jest.fn(),
    getGroupById: jest.fn(),
    createGroup: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
  },
}));

jest.mock("../../../../../src/core/middleware/validation.middleware.js", () => ({
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

describe("Group Controller", () => {
  let app: express.Application;
  let mockGroupService: jest.Mocked<GroupService>;

  const mockUser1 = {
    id: "user-1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: createMockDate(),
    updatedAt: createMockDate(),
  };

  const mockUser2 = {
    id: "user-2",
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: createMockDate(),
    updatedAt: createMockDate(),
  };

  const mockGroup: Group = {
    id: "group-1",
    name: "Test Group",
    description: "A test group",
    members: [mockUser1, mockUser2],
    createdAt: createMockDate(),
    updatedAt: createMockDate(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockGroupService = {
      createGroup: jest.fn(),
      getGroupById: jest.fn(),
      getAllGroups: jest.fn(),
      addMemberToGroup: jest.fn(),
      removeMemberFromGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
    } as unknown as jest.Mocked<GroupService>;

    app.use("/groups", createGroupRouter(mockGroupService));

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

  describe("POST /groups", () => {
    const createGroupDto: CreateGroup = {
      name: "New Group",
      description: "A new test group",
      initialMemberIds: ["user-1", "user-2"],
    };

    it("should create a new group and return 201 status with group data", async () => {
      mockGroupService.createGroup.mockResolvedValue(mockGroup);

      const response = await request(app).post("/groups").send(createGroupDto);

      expect(response.status).toBe(HttpCode.CREATED);
      expect(response.body).toEqual({
        ...mockGroup,
        createdAt: mockGroup.createdAt.toISOString(),
        updatedAt: mockGroup.updatedAt.toISOString(),
        members: mockGroup.members.map((member) => ({
          ...member,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        })),
      });
      expect(mockGroupService.createGroup).toHaveBeenCalledWith(createGroupDto);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.CONFLICT,
        description: "Group with this name already exists.",
      });

      mockGroupService.createGroup.mockRejectedValue(error);

      const response = await request(app).post("/groups").send(createGroupDto);

      expect(response.status).toBe(HttpCode.CONFLICT);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.CONFLICT,
          message: "Group with this name already exists.",
        },
      });
    });
  });

  describe("GET /groups", () => {
    const mockPaginatedResult = {
      groups: [mockGroup],
      total: 1,
    };

    it("should return paginated groups with 200 status", async () => {
      mockGroupService.getAllGroups.mockResolvedValue(mockPaginatedResult);

      const response = await request(app).get("/groups?page=1&limit=10");

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        data: [
          {
            ...mockGroup,
            createdAt: mockGroup.createdAt.toISOString(),
            updatedAt: mockGroup.updatedAt.toISOString(),
            members: mockGroup.members.map((member) => ({
              ...member,
              createdAt: member.createdAt.toISOString(),
              updatedAt: member.updatedAt.toISOString(),
            })),
          },
        ],
        pagination: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
      expect(mockGroupService.getAllGroups).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it("should return 400 if page or limit are invalid", async () => {
      // Mock the error that would be thrown by the controller
      const error = new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Page and limit query parameters must be positive integers.",
      });
      mockGroupService.getAllGroups.mockRejectedValue(error);

      const response = await request(app).get("/groups?page=0&limit=10");

      expect(response.status).toBe(HttpCode.BAD_REQUEST);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.BAD_REQUEST,
          message: "Page and limit query parameters must be positive integers.",
        },
      });
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: "An unexpected error occurred while retrieving groups.",
      });

      mockGroupService.getAllGroups.mockRejectedValue(error);

      const response = await request(app).get("/groups?page=1&limit=10");

      expect(response.status).toBe(HttpCode.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.INTERNAL_SERVER_ERROR,
          message: "An unexpected error occurred while retrieving groups.",
        },
      });
    });
  });

  describe("GET /groups/:id", () => {
    const groupId = "group-1";

    it("should return a group when found by ID with 200 status", async () => {
      mockGroupService.getGroupById.mockResolvedValue(mockGroup);

      const response = await request(app).get(`/groups/${groupId}`);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        ...mockGroup,
        createdAt: mockGroup.createdAt.toISOString(),
        updatedAt: mockGroup.updatedAt.toISOString(),
        members: mockGroup.members.map((member) => ({
          ...member,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        })),
      });
      expect(mockGroupService.getGroupById).toHaveBeenCalledWith(groupId);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Group not found.",
      });

      mockGroupService.getGroupById.mockRejectedValue(error);

      const response = await request(app).get(`/groups/${groupId}`);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "Group not found.",
        },
      });
    });
  });

  describe("PATCH /groups/members/add", () => {
    const updateMemberDto: UpdateGroupMember = {
      groupId: "group-1",
      userId: "user-3",
    };

    it("should add a member to a group and return 200 status", async () => {
      mockGroupService.addMemberToGroup.mockResolvedValue(mockGroup);

      const response = await request(app).patch("/groups/members/add").send(updateMemberDto);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        ...mockGroup,
        createdAt: mockGroup.createdAt.toISOString(),
        updatedAt: mockGroup.updatedAt.toISOString(),
        members: mockGroup.members.map((member) => ({
          ...member,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        })),
      });
      expect(mockGroupService.addMemberToGroup).toHaveBeenCalledWith(updateMemberDto);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Group not found.",
      });

      mockGroupService.addMemberToGroup.mockRejectedValue(error);

      const response = await request(app).patch("/groups/members/add").send(updateMemberDto);

      expect(response.status).toBe(HttpCode.NOT_FOUND);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.NOT_FOUND,
          message: "Group not found.",
        },
      });
    });
  });

  describe("PATCH /groups/members/remove", () => {
    const updateMemberDto: UpdateGroupMember = {
      groupId: "group-1",
      userId: "user-2",
    };

    it("should remove a member from a group and return 200 status", async () => {
      mockGroupService.removeMemberFromGroup.mockResolvedValue(mockGroup);

      const response = await request(app).patch("/groups/members/remove").send(updateMemberDto);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        ...mockGroup,
        createdAt: mockGroup.createdAt.toISOString(),
        updatedAt: mockGroup.updatedAt.toISOString(),
        members: mockGroup.members.map((member) => ({
          ...member,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        })),
      });
      expect(mockGroupService.removeMemberFromGroup).toHaveBeenCalledWith(updateMemberDto);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "User is not a member of this group.",
      });

      mockGroupService.removeMemberFromGroup.mockRejectedValue(error);

      const response = await request(app).patch("/groups/members/remove").send(updateMemberDto);

      expect(response.status).toBe(HttpCode.BAD_REQUEST);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.BAD_REQUEST,
          message: "User is not a member of this group.",
        },
      });
    });
  });

  describe("PATCH /groups/:id", () => {
    const groupId = "group-1";
    const updateGroupDto: UpdateGroupDto = {
      name: "Updated Group Name",
      description: "Updated description",
    };

    it("should update a group and return 200 status", async () => {
      mockGroupService.updateGroup.mockResolvedValue(mockGroup);

      const response = await request(app).patch(`/groups/${groupId}`).send(updateGroupDto);

      expect(response.status).toBe(HttpCode.OK);
      expect(response.body).toEqual({
        ...mockGroup,
        createdAt: mockGroup.createdAt.toISOString(),
        updatedAt: mockGroup.updatedAt.toISOString(),
        members: mockGroup.members.map((member) => ({
          ...member,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        })),
      });
      expect(mockGroupService.updateGroup).toHaveBeenCalledWith(groupId, updateGroupDto);
    });

    it("should return 404 if route doesn't match", async () => {
      const response = await request(app).patch("/groups/").send(updateGroupDto);

      expect(response.status).toBe(404);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.CONFLICT,
        description: "Another group with this name already exists.",
      });

      mockGroupService.updateGroup.mockRejectedValue(error);

      const response = await request(app).patch(`/groups/${groupId}`).send(updateGroupDto);

      expect(response.status).toBe(HttpCode.CONFLICT);
      expect(response.body).toEqual({
        error: {
          statusCode: HttpCode.CONFLICT,
          message: "Another group with this name already exists.",
        },
      });
    });
  });

  describe("DELETE /groups/:id", () => {
    const groupId = "group-1";

    it("should delete a group and return 204 status", async () => {
      mockGroupService.deleteGroup.mockResolvedValue(undefined);

      const response = await request(app).delete(`/groups/${groupId}`);

      expect(response.status).toBe(HttpCode.NO_CONTENT);
      expect(response.body).toEqual({});
      expect(mockGroupService.deleteGroup).toHaveBeenCalledWith(groupId);
    });

    it("should pass error to next middleware when service throws an error", async () => {
      const error = new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "Group not found.",
      });

      mockGroupService.deleteGroup.mockRejectedValue(error);

      const response = await request(app).delete(`/groups/${groupId}`);

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
