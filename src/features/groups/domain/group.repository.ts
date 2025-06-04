import { Group } from './group.entity.js';
import { User as _User } from '../../users/domain/user.entity.js';

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  create(data: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'members'>, initialMemberIds: string[]): Promise<Group>;
  findByName(name: string): Promise<Group | null>;
  addMember(groupId: string, userId: string): Promise<Group | null>;
  removeMember(groupId: string, userId: string): Promise<Group | null>;
}
