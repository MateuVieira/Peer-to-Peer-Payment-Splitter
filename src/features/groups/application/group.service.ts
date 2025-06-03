import { IGroupRepository } from '../domain/group.repository.js';
import { Group } from '../domain/group.entity.js';
import { IUserRepository } from '../../users/domain/user.repository.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';

// DTO for creating a group
export interface CreateGroupDto {
  name: string;
  description?: string;
  initialMemberIds: string[]; // IDs of users to be added initially
}

// DTO for adding/removing a member
export interface UpdateGroupMemberDto {
  groupId: string;
  userId: string;
}

export class GroupService {
  constructor(
    private groupRepository: IGroupRepository,
    private userRepository: IUserRepository, // For validating user existence
  ) {}

  async createGroup(groupData: CreateGroupDto): Promise<Group> {
    // Validate that all initial members exist
    for (const userId of groupData.initialMemberIds) {
      const userExists = await this.userRepository.findById(userId);
      if (!userExists) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: `User with ID ${userId} not found. Cannot create group.`,
        });
      }
    }
    
    // Check if a group with the same name already exists (optional, based on requirements)
    const existingGroup = await this.groupRepository.findByName(groupData.name);
    if (existingGroup) {
        throw new AppError({
            httpCode: HttpCode.CONFLICT,
            description: `Group with name "${groupData.name}" already exists.`,
        });
    }

    // The repository's create method expects Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'members'>
    // and initialMemberIds separately.
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

  async addMemberToGroup(dto: UpdateGroupMemberDto): Promise<Group> {
    const { groupId, userId } = dto;

    // Check if group exists
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }

    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `User with ID ${userId} not found.`,
      });
    }

    // Check if user is already a member (optional, Prisma connect might handle this gracefully or throw)
    // For a cleaner API, it's good to check here.
    if (group.members.some(member => member.id === userId)) {
      throw new AppError({
        httpCode: HttpCode.CONFLICT,
        description: `User ${user.name} is already a member of group ${group.name}.`,
      });
    }

    const updatedGroup = await this.groupRepository.addMember(groupId, userId);
    if (!updatedGroup) {
      // This might happen if addMember returns null on failure (e.g., underlying Prisma error)
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: 'Failed to add member to group.',
      });
    }
    return updatedGroup;
  }

  async removeMemberFromGroup(dto: UpdateGroupMemberDto): Promise<Group> {
    const { groupId, userId } = dto;

     // Check if group exists
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }

    // Check if user exists (optional, but good for clear error message)
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND, // Or BAD_REQUEST if we consider it a faulty request
        description: `User with ID ${userId} not found. Cannot remove from group.`,
      });
    }
    
    // Check if user is actually a member
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
