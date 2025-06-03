import { Group } from './group.entity.js';
import { User as _User } from '../../users/domain/user.entity.js'; // Needed for methods involving members

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  create(data: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'members'>, initialMemberIds: string[]): Promise<Group>;
  // For create, we might pass initial member IDs and handle the connection in the implementation.
  // Alternatively, members could be part of the Omit if handled differently.
  
  findByName(name: string): Promise<Group | null>; // Example: useful for checking uniqueness
  
  // Methods for managing members
  addMember(groupId: string, userId: string): Promise<Group | null>;
  removeMember(groupId: string, userId: string): Promise<Group | null>;
  
  // Add other methods like update, delete, list, listByUserId as needed
}
