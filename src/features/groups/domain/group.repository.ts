import { Group } from "./group.entity.js";

export interface PaginatedGroupsResult {
  groups: Group[];
  total: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  create(
    data: Omit<Group, "id" | "createdAt" | "updatedAt" | "members">,
    initialMemberIds: string[]
  ): Promise<Group>;
  findByName(name: string): Promise<Group | null>;
  findAll(params: PaginationParams): Promise<PaginatedGroupsResult>;
  addMember(groupId: string, userId: string): Promise<Group | null>;
  removeMember(groupId: string, userId: string): Promise<Group | null>;
  update(
    groupId: string,
    data: Partial<Omit<Group, "id" | "createdAt" | "updatedAt" | "members">>
  ): Promise<Group | null>;
  delete(groupId: string): Promise<boolean>;
}
