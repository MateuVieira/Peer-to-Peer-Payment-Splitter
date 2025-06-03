import { Request, Response, NextFunction, Router } from 'express';
import { GroupService, CreateGroupDto, UpdateGroupMemberDto, CreateGroupSchema, ModifyGroupMemberSchema } from '../application/index.js';
import { AppError, HttpCode } from '../../../core/error/index.js';
import { validateRequest } from '../../../core/index.js';

export function createGroupRouter(groupService: GroupService): Router {
  const groupRouter: Router = Router();

// POST /groups - Create a new group
groupRouter.post('/', validateRequest(CreateGroupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createGroupData = req.body as CreateGroupDto;
    const newGroup = await groupService.createGroup(createGroupData);
    res.status(HttpCode.CREATED).json(newGroup);
  } catch (error) {
    next(error);
  }
});

// GET /groups/:id - Get group by ID
groupRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Group ID is required.' });
    }
    const group = await groupService.getGroupById(id);
    res.status(HttpCode.OK).json(group);
  } catch (error) {
    next(error);
  }
});

// POST /groups/members/add - Add a member to a group
groupRouter.post('/members/add', validateRequest(ModifyGroupMemberSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateMemberData = req.body as UpdateGroupMemberDto;
    const updatedGroup = await groupService.addMemberToGroup(updateMemberData);
    res.status(HttpCode.OK).json(updatedGroup);
  } catch (error) {
    next(error);
  }
});

// POST /groups/members/remove - Remove a member from a group
groupRouter.post('/members/remove', validateRequest(ModifyGroupMemberSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateMemberData = req.body as UpdateGroupMemberDto;
    const updatedGroup = await groupService.removeMemberFromGroup(updateMemberData);
    res.status(HttpCode.OK).json(updatedGroup);
  } catch (error) {
    next(error);
  }
});

  return groupRouter;
}
