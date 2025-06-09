import { Request, Response, NextFunction, Router } from "express";
import {
  GroupService,
  CreateGroup,
  UpdateGroupMember,
  UpdateGroupDto,
  CreateGroupSchema,
  ModifyGroupMemberSchema,
  UpdateGroupSchema,
} from "../application/index.js";
import { AppError, HttpCode } from "../../../core/error/index.js";
import { validateRequest } from "../../../core/index.js";

export function createGroupRouter(groupService: GroupService): Router {
  const groupRouter: Router = Router();

  // POST /groups - Create a new group
  groupRouter.post(
    "/",
    validateRequest(CreateGroupSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const createGroupData = req.body as CreateGroup;
        const newGroup = await groupService.createGroup(createGroupData);
        res.status(HttpCode.CREATED).json(newGroup);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /groups - Get all groups
  groupRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (page <= 0 || limit <= 0) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "Page and limit query parameters must be positive integers.",
        });
      }

      const { groups, total } = await groupService.getAllGroups({ page, limit });

      res.status(HttpCode.OK).json({
        data: groups,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /groups/:id - Get group by ID
  groupRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "Group ID is required.",
        });
      }
      const group = await groupService.getGroupById(id);
      res.status(HttpCode.OK).json(group);
    } catch (error) {
      next(error);
    }
  });

  // PATCH /groups/members/add - Add a member to a group
  groupRouter.patch(
    "/members/add",
    validateRequest(ModifyGroupMemberSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const updateMemberData = req.body as UpdateGroupMember;
        const updatedGroup = await groupService.addMemberToGroup(updateMemberData);
        res.status(HttpCode.OK).json(updatedGroup);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /groups/members/remove - Remove a member from a group
  groupRouter.patch(
    "/members/remove",
    validateRequest(ModifyGroupMemberSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const updateMemberData = req.body as UpdateGroupMember;
        const updatedGroup = await groupService.removeMemberFromGroup(updateMemberData);
        res.status(HttpCode.OK).json(updatedGroup);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /groups/:id - Update group details
  groupRouter.patch(
    "/:id",
    validateRequest(UpdateGroupSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id: groupId } = req.params;
        if (!groupId) {
          throw new AppError({
            httpCode: HttpCode.BAD_REQUEST,
            description: "Group ID parameter is required for update.",
          });
        }
        const updateData = req.body as UpdateGroupDto;

        const updatedGroup = await groupService.updateGroup(groupId, updateData);
        res.status(HttpCode.OK).json(updatedGroup);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /groups/:id - Delete a group
  groupRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: groupId } = req.params;
      if (!groupId) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "Group ID parameter is required for deletion.",
        });
      }
      await groupService.deleteGroup(groupId);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  });

  return groupRouter;
}
