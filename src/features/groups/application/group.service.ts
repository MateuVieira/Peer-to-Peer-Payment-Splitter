import {
  IGroupRepository,
  PaginatedGroupsResult,
  PaginationParams,
} from "../domain/group.repository.js";
import { Group } from "../domain/group.entity.js";
import { IUserRepository } from "../../users/domain/user.repository.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import { logger } from "../../../core/logger.js";

export interface CreateGroup {
  name: string;
  description?: string;
  initialMemberIds: string[];
}

export interface UpdateGroupMember {
  groupId: string;
  userId: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string | null;
}

export class GroupService {
  constructor(
    private groupRepository: IGroupRepository,
    private userRepository: IUserRepository
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
        description: `Group with ID ${id} not found.`,
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

    if (group.members.some((member) => member.id === userId)) {
      throw new AppError({
        httpCode: HttpCode.CONFLICT,
        description: `User ${user.name} is already a member of group ${group.name}.`,
      });
    }

    const updatedGroup = await this.groupRepository.addMember(groupId, userId);
    if (!updatedGroup) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: "Failed to add member to group.",
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

    if (!group.members.some((member) => member.id === userId)) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `User ${user.name} is not a member of group ${group.name}.`,
      });
    }

    const updatedGroup = await this.groupRepository.removeMember(groupId, userId);
    if (!updatedGroup) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: "Failed to remove member from group.",
      });
    }
    return updatedGroup;
  }

  private async nameConflictCheck(
    newName: string | undefined,
    name: string | undefined,
    groupId: string
  ): Promise<boolean> {
    if (newName && newName !== name) {
      const existingGroupWithName = await this.groupRepository.findByName(newName);
      if (existingGroupWithName && existingGroupWithName.id !== groupId) {
        throw new AppError({
          httpCode: HttpCode.CONFLICT,
          description: `Another group with the name "${newName}" already exists.`,
        });
      }
    }
    return false;
  }

  async updateGroup(groupId: string, updateData: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found. Cannot update.`,
      });
    }

    await this.nameConflictCheck(updateData.name, group.name, groupId);

    const finalUpdateData: Partial<Omit<Group, "id" | "createdAt" | "updatedAt" | "members">> = {};
    let hasChanges = false;

    if (
      Object.prototype.hasOwnProperty.call(updateData, "name") &&
      updateData.name !== group.name
    ) {
      finalUpdateData.name = updateData.name;
      hasChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "description")) {
      if (updateData.description !== group.description) {
        finalUpdateData.description = updateData.description;
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return group;
    }

    const updatedGroup = await this.groupRepository.update(groupId, finalUpdateData);
    if (!updatedGroup) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description:
          "Failed to update group. The group may have been deleted during the operation or an unexpected error occurred.",
      });
    }

    return updatedGroup;
  }

  async deleteGroup(groupId: string): Promise<void> {
    const groupExists = await this.groupRepository.findById(groupId);
    if (!groupExists) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found. Cannot delete.`,
      });
    }

    const deletionSuccess = await this.groupRepository.delete(groupId);
    if (!deletionSuccess) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Failed to delete group with ID ${groupId}. It might have been deleted by another process or an unexpected error occurred.`,
      });
    }
  }

  async getAllGroups(params: PaginationParams): Promise<PaginatedGroupsResult> {
    try {
      const paginatedResult = await this.groupRepository.findAll(params);
      return paginatedResult;
    } catch (error) {
      logger.error({ err: error }, "Error retrieving all groups in service");
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: "An unexpected error occurred while retrieving groups.",
      });
    }
  }
}
