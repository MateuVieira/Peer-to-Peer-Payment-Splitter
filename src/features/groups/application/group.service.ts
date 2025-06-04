import { IGroupRepository } from '../domain/group.repository.js';
import { Group } from '../domain/group.entity.js';
import { IUserRepository } from '../../users/domain/user.repository.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';

export interface CreateGroup {
  name: string;
  description?: string;
  initialMemberIds: string[];
}

export interface UpdateGroupMember {
  groupId: string;
  userId: string;
}

export class GroupService {
  constructor(
    private groupRepository: IGroupRepository,
    private userRepository: IUserRepository,
  ) {}

  async createGroup(groupData: CreateGroup): Promise<Group> {
    for (const userId of groupData.initialMemberIds) {
      const userExists = await this.userRepository.findById(userId);
      if (!userExists) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: `User with ID ${userId} not found. Cannot create group.`,
        });
      }
    }
    
    const existingGroup = await this.groupRepository.findByName(groupData.name);
    if (existingGroup) {
        throw new AppError({
            httpCode: HttpCode.CONFLICT,
            description: `Group with name "${groupData.name}" already exists.`,
        });
    }

    const { initialMemberIds, ...restOfGroupData } = groupData;
    const newGroup = await this.groupRepository.create(restOfGroupData, initialMemberIds);
    return newGroup;
  }

  async getGroupById(id: string): Promise<Group> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: 'Group not found.',
      });
    }
    return group;
  }

  async addMemberToGroup(groupMember: UpdateGroupMember): Promise<Group> {
    const { groupId, userId } = groupMember;

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `User with ID ${userId} not found.`,
      });
    }

    if (group.members.some(member => member.id === userId)) {
      throw new AppError({
        httpCode: HttpCode.CONFLICT,
        description: `User ${user.name} is already a member of group ${group.name}.`,
      });
    }

    const updatedGroup = await this.groupRepository.addMember(groupId, userId);
    if (!updatedGroup) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: 'Failed to add member to group.',
      });
    }
    return updatedGroup;
  }

  async removeMemberFromGroup(groupMember: UpdateGroupMember): Promise<Group> {
    const { groupId, userId } = groupMember;

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `User with ID ${userId} not found. Cannot remove from group.`,
      });
    }
    
    if (!group.members.some(member => member.id === userId)) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `User ${user.name} is not a member of group ${group.name}.`,
      });
    }

    const updatedGroup = await this.groupRepository.removeMember(groupId, userId);
     if (!updatedGroup) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: 'Failed to remove member from group.',
      });
    }
    return updatedGroup;
  }
}
