import { GroupService } from '../../../../../src/features/groups/application/group.service.js';
import { IGroupRepository, PaginatedGroupsResult, PaginationParams } from '../../../../../src/features/groups/domain/group.repository.js';
import { IUserRepository } from '../../../../../src/features/users/domain/user.repository.js';
import { Group } from '../../../../../src/features/groups/domain/group.entity.js';
import { AppError, HttpCode } from '../../../../../src/core/error/app.error.js';

jest.mock('../../../../../src/core/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// Mock repositories
const mockGroupRepository: jest.Mocked<IGroupRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
};

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('GroupService', () => {
  let groupService: GroupService;

  beforeEach(() => {
    jest.clearAllMocks();
    groupService = new GroupService(mockGroupRepository, mockUserRepository);
  });

  describe('getGroupById', () => {
    it('should return a group when found', async () => {
      const groupId = 'test-group-id';

      const mockGroup: Group = {
        id: groupId,
        name: 'Test Group',
        description: 'A group for testing',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      mockGroupRepository.findById.mockResolvedValue(mockGroup);

      const result = await groupService.getGroupById(groupId);

      expect(result).toEqual(mockGroup);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError with NOT_FOUND if group is not found', async () => {
      const groupId = 'non-existent-group-id';
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(groupService.getGroupById(groupId)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Group with ID ${groupId} not found.`,
        }),
      );

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('createGroup', () => {
    const mockUserData = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a group successfully with no initial members', async () => {
      const groupData = {
        name: 'New Group',
        description: 'A new group for testing',
        initialMemberIds: [],
      };

      const expectedGroup: Group = {
        id: 'new-group-id',
        ...groupData,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      mockUserRepository.findById.mockResolvedValue(mockUserData); // Should not be called if initialMemberIds is empty
      mockGroupRepository.findByName.mockResolvedValue(null);
      mockGroupRepository.create.mockResolvedValue(expectedGroup);

      const result = await groupService.createGroup(groupData);

      expect(result).toEqual(expectedGroup);
      expect(mockGroupRepository.findByName).toHaveBeenCalledWith(groupData.name);
      expect(mockGroupRepository.create).toHaveBeenCalledWith(
        { name: groupData.name, description: groupData.description },
        groupData.initialMemberIds,
      );
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should create a group successfully with existing initial members', async () => {
      const groupData = {
        name: 'Another New Group',
        initialMemberIds: [mockUserData.id],
      };

      const expectedGroup: Group = {
        id: 'another-group-id',
        name: groupData.name,
        description: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [mockUserData],
      };

      mockUserRepository.findById.mockResolvedValue(mockUserData);
      mockGroupRepository.findByName.mockResolvedValue(null);
      mockGroupRepository.create.mockResolvedValue(expectedGroup);

      const result = await groupService.createGroup(groupData);

      expect(result).toEqual(expectedGroup);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserData.id);
      expect(mockGroupRepository.findByName).toHaveBeenCalledWith(groupData.name);
      expect(mockGroupRepository.create).toHaveBeenCalledWith(
        { name: groupData.name },
        groupData.initialMemberIds,
      );
    });

    it('should throw AppError if an initial member user is not found', async () => {
      const groupData = {
        name: 'Group With Invalid User',
        initialMemberIds: ['non-existent-user-id'],
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(groupService.createGroup(groupData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: `User with ID ${groupData.initialMemberIds[0]} not found. Cannot create group.`,
        }),
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(groupData.initialMemberIds[0]);
      expect(mockGroupRepository.findByName).not.toHaveBeenCalled();
      expect(mockGroupRepository.create).not.toHaveBeenCalled();
    });

    it('should throw AppError if a group with the same name already exists', async () => {
      const groupData = {
        name: 'Existing Group Name',
        initialMemberIds: [],
      };
      const existingGroup: Group = {
        id: 'existing-group-id',
        name: groupData.name,
        description: 'An existing group',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      mockGroupRepository.findByName.mockResolvedValue(existingGroup);

      await expect(groupService.createGroup(groupData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.CONFLICT,
          description: `Group with name "${groupData.name}" already exists.`,
        }),
      );
      expect(mockGroupRepository.findByName).toHaveBeenCalledWith(groupData.name);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockGroupRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('addMemberToGroup', () => {
    const groupId = 'group-1';
    const userId = 'user-1';

    const mockGroup: Group = {
      id: groupId,
      name: 'Test Group',
      description: 'A group for testing',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [], // Initially no members for some tests
    };

    const mockUser = {
      id: userId,
      name: 'Test User',
      email: 'user@example.com',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully add a member to a group', async () => {
      const groupWithMember: Group = { ...mockGroup, members: [mockUser] };
      mockGroupRepository.findById.mockResolvedValue(mockGroup);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockGroupRepository.addMember.mockResolvedValue(groupWithMember);

      const result = await groupService.addMemberToGroup({ groupId, userId });

      expect(result).toEqual(groupWithMember);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockGroupRepository.addMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should throw AppError if group is not found', async () => {
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(groupService.addMemberToGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Group with ID ${groupId} not found.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockGroupRepository.addMember).not.toHaveBeenCalled();
    });

    it('should throw AppError if user is not found', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockGroup);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(groupService.addMemberToGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `User with ID ${userId} not found.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockGroupRepository.addMember).not.toHaveBeenCalled();
    });

    it('should throw AppError if user is already a member of the group', async () => {
      const groupWithExistingMember: Group = { ...mockGroup, members: [mockUser] };
      mockGroupRepository.findById.mockResolvedValue(groupWithExistingMember);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(groupService.addMemberToGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.CONFLICT,
          description: `User ${mockUser.name} is already a member of group ${mockGroup.name}.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockGroupRepository.addMember).not.toHaveBeenCalled();
    });

    it('should throw AppError if groupRepository.addMember fails', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockGroup);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockGroupRepository.addMember.mockResolvedValue(null);

      await expect(groupService.addMemberToGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: 'Failed to add member to group.',
        }),
      );
      expect(mockGroupRepository.addMember).toHaveBeenCalledWith(groupId, userId);
    });
  });

  describe('removeMemberFromGroup', () => {
    const groupId = 'group-1';
    const userId = 'user-1';

    const mockUser = {
      id: userId,
      name: 'Test User',
      email: 'user@example.com',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockGroupWithMember: Group = {
      id: groupId,
      name: 'Test Group',
      description: 'A group for testing',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [mockUser],
    };

    const mockGroupWithoutMember: Group = {
      id: groupId,
      name: 'Test Group',
      description: 'A group for testing',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
    };

    it('should successfully remove a member from a group', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockGroupWithMember);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockGroupRepository.removeMember.mockResolvedValue(mockGroupWithoutMember);

      const result = await groupService.removeMemberFromGroup({ groupId, userId });

      expect(result).toEqual(mockGroupWithoutMember);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockGroupRepository.removeMember).toHaveBeenCalledWith(groupId, userId);
    });

    it('should throw AppError if group is not found', async () => {
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(groupService.removeMemberFromGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Group with ID ${groupId} not found.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockGroupRepository.removeMember).not.toHaveBeenCalled();
    });

    it('should throw AppError if user is not found', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockGroupWithMember);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(groupService.removeMemberFromGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `User with ID ${userId} not found. Cannot remove from group.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockGroupRepository.removeMember).not.toHaveBeenCalled();
    });

    it('should throw AppError if user is not a member of the group', async () => {
      const groupWithoutTargetMember: Group = { ...mockGroupWithMember, members: [] };
      mockGroupRepository.findById.mockResolvedValue(groupWithoutTargetMember);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(groupService.removeMemberFromGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: `User ${mockUser.name} is not a member of group ${groupWithoutTargetMember.name}.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockGroupRepository.removeMember).not.toHaveBeenCalled();
    });

    it('should throw AppError if groupRepository.removeMember fails', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockGroupWithMember);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockGroupRepository.removeMember.mockResolvedValue(null);

      await expect(groupService.removeMemberFromGroup({ groupId, userId })).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: 'Failed to remove member from group.',
        }),
      );
      expect(mockGroupRepository.removeMember).toHaveBeenCalledWith(groupId, userId);
    });
  });

  describe('updateGroup', () => {
    const groupId = 'group-to-update-id';

    const originalGroup: Group = {
      id: groupId,
      name: 'Original Group Name',
      description: 'Original description',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
    };

    it('should successfully update group name only', async () => {
      const updateData = { name: 'New Group Name' };
      const expectedUpdatedGroup: Group = { 
        ...originalGroup, 
        ...updateData, 
        updatedAt: new Date() 
      };

      mockGroupRepository.findById.mockResolvedValue(originalGroup);
      mockGroupRepository.findByName.mockResolvedValue(null);
      mockGroupRepository.update.mockResolvedValue(expectedUpdatedGroup);

      const result = await groupService.updateGroup(groupId, updateData);

      expect(result).toEqual(expectedUpdatedGroup);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findByName).toHaveBeenCalledWith(updateData.name);
      expect(mockGroupRepository.update).toHaveBeenCalledWith(
        groupId, 
        { name: updateData.name }
      );
    });

    it('should successfully update group description only', async () => {
      const updateData = { description: 'New description' };
      const expectedUpdatedGroup: Group = { 
        ...originalGroup, 
        ...updateData, 
        updatedAt: new Date() 
      };

      mockGroupRepository.findById.mockResolvedValue(originalGroup);
      mockGroupRepository.update.mockResolvedValue(expectedUpdatedGroup);

      const result = await groupService.updateGroup(groupId, updateData);

      expect(result).toEqual(expectedUpdatedGroup);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findByName).not.toHaveBeenCalled();
      expect(mockGroupRepository.update).toHaveBeenCalledWith(
        groupId, 
        { description: updateData.description }
      );
    });

    it('should successfully update both name and description', async () => {
      const updateData = { name: 'New Name', description: 'New description' };
      const expectedUpdatedGroup: Group = { 
        ...originalGroup, 
        ...updateData, 
        updatedAt: new Date() 
      };

      mockGroupRepository.findById.mockResolvedValue(originalGroup);
      mockGroupRepository.findByName.mockResolvedValue(null);
      mockGroupRepository.update.mockResolvedValue(expectedUpdatedGroup);

      const result = await groupService.updateGroup(groupId, updateData);

      expect(result).toEqual(expectedUpdatedGroup);
      expect(mockGroupRepository.update).toHaveBeenCalledWith(groupId, updateData);
    });

    it('should return original group if updateData provides no actual changes', async () => {
      const updateData = { 
        name: originalGroup.name, 
        description: originalGroup.description 
      };

      mockGroupRepository.findById.mockResolvedValue(originalGroup);
      mockGroupRepository.findByName.mockResolvedValue(null); 

      const result = await groupService.updateGroup(groupId, updateData);

      expect(result).toEqual(originalGroup);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findByName).not.toHaveBeenCalled();
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
    });

    it('should return original group if updateData is empty', async () => {
      const updateData = {};
      mockGroupRepository.findById.mockResolvedValue(originalGroup);

      const result = await groupService.updateGroup(groupId, updateData);

      expect(result).toEqual(originalGroup);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findByName).not.toHaveBeenCalled();
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppError NOT_FOUND if group to update is not found', async () => {
      const updateData = { name: 'Any Name' };
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(groupService.updateGroup(groupId, updateData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Group with ID ${groupId} not found. Cannot update.`,
        }),
      );

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppError CONFLICT if new name conflicts with another group', async () => {
      const updateData = { name: 'Conflicting Name' };

      const otherExistingGroup: Group = {
        id: 'other-group-id',
        name: updateData.name,
        description: 'Some other group',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      mockGroupRepository.findById.mockResolvedValue(originalGroup);
      mockGroupRepository.findByName.mockResolvedValue(otherExistingGroup);

      await expect(groupService.updateGroup(groupId, updateData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.CONFLICT,
          description: `Another group with the name "${updateData.name}" already exists.`,
        }),
      );

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.findByName).toHaveBeenCalledWith(updateData.name);
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppError INTERNAL_SERVER_ERROR if repository update fails', async () => {
      const updateData = { name: 'New Name For Failing Update' };
      mockGroupRepository.findById.mockResolvedValue(originalGroup);
      mockGroupRepository.findByName.mockResolvedValue(null);
      mockGroupRepository.update.mockResolvedValue(null);

      await expect(groupService.updateGroup(groupId, updateData)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: 'Failed to update group. The group may have been deleted during the operation or an unexpected error occurred.',
        }),
      );
      
      expect(mockGroupRepository.update).toHaveBeenCalledWith(
        groupId, 
        { name: updateData.name }
      );
    });
  });

  describe('deleteGroup', () => {
    const groupId = 'group-to-delete-id';

    const mockExistingGroup: Group = {
      id: groupId,
      name: 'Group To Delete',
      description: 'This group will be deleted',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
    };

    it('should successfully delete a group', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockExistingGroup);
      mockGroupRepository.delete.mockResolvedValue(true);

      await groupService.deleteGroup(groupId);

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.delete).toHaveBeenCalledWith(groupId);
    });

    it('should throw AppError NOT_FOUND if group to delete is not found', async () => {
      mockGroupRepository.findById.mockResolvedValue(null);

      await expect(groupService.deleteGroup(groupId)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Group with ID ${groupId} not found. Cannot delete.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AppError INTERNAL_SERVER_ERROR if repository delete returns false', async () => {
      mockGroupRepository.findById.mockResolvedValue(mockExistingGroup);
      mockGroupRepository.delete.mockResolvedValue(false);

      await expect(groupService.deleteGroup(groupId)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: `Failed to delete group with ID ${groupId}. It might have been deleted by another process or an unexpected error occurred.`,
        }),
      );
      expect(mockGroupRepository.findById).toHaveBeenCalledWith(groupId);
      expect(mockGroupRepository.delete).toHaveBeenCalledWith(groupId);
    });
  });

  describe('getAllGroups', () => {
    const paginationParams: PaginationParams = { page: 1, limit: 10 };
    
    const mockGroupsArray: Group[] = [
      {
        id: 'group-1',
        name: 'Group One',
        description: 'First test group',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      },
      {
        id: 'group-2',
        name: 'Group Two',
        description: 'Second test group',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      },
    ];

    const mockPaginatedResult: PaginatedGroupsResult = {
      groups: mockGroupsArray,
      total: mockGroupsArray.length,
    };

    const mockEmptyPaginatedResult: PaginatedGroupsResult = {
      groups: [],
      total: 0,
    };

    it('should return a paginated result of groups when groups exist', async () => {
      mockGroupRepository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await groupService.getAllGroups(paginationParams);

      expect(result).toEqual(mockPaginatedResult);
      expect(result.groups).toHaveLength(mockGroupsArray.length);
      expect(mockGroupRepository.findAll).toHaveBeenCalledWith(paginationParams);
    });

    it('should return an empty paginated result when no groups exist', async () => {
      mockGroupRepository.findAll.mockResolvedValue(mockEmptyPaginatedResult);

      const result = await groupService.getAllGroups(paginationParams);

      expect(result).toEqual(mockEmptyPaginatedResult);
      expect(result.groups).toHaveLength(0);
      expect(mockGroupRepository.findAll).toHaveBeenCalledWith(paginationParams);
    });

    it('should throw AppError INTERNAL_SERVER_ERROR if repository findAll fails', async () => {
      const errorMessage = 'Database connection lost';
      mockGroupRepository.findAll.mockRejectedValue(new Error(errorMessage));

      await expect(groupService.getAllGroups(paginationParams)).rejects.toThrow(
        new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: 'An unexpected error occurred while retrieving groups.',
        }),
      );
      expect(mockGroupRepository.findAll).toHaveBeenCalledWith(paginationParams);
    });
  });
});
