import {
  PrismaClient,
  Group as PrismaGroupModel, // Renamed to avoid conflict with domain Group
  User as PrismaUserModel,   // Renamed to avoid conflict with domain User
} from '../../../../generated/prisma/index.js';
import { IGroupRepository } from '../../domain/group.repository.js';
import { Group } from '../../domain/group.entity.js';
import { User } from '../../../users/domain/user.entity.js'; // Domain User entity

// Helper to map Prisma UserModel to our domain User entity
function toDomainUser(prismaUser: PrismaUserModel): User {
  return {
    id: prismaUser.id,
    name: prismaUser.name,
    email: prismaUser.email,
    createdAt: new Date(prismaUser.createdAt),
    updatedAt: new Date(prismaUser.updatedAt),
    // groups: [], // Note: If User entity expects groups, this mapping might need adjustment
                 // or be handled by the UserRepository's mapping. For now, keeping it simple.
  };
}

// Helper to map Prisma GroupModel (with its members) to our domain Group entity
function toDomainGroup(
  prismaGroup: PrismaGroupModel & { members: PrismaUserModel[] },
): Group {
  return {
    id: prismaGroup.id,
    name: prismaGroup.name,
    description: prismaGroup.description ?? undefined, // Handle null from Prisma
    createdAt: new Date(prismaGroup.createdAt),
    updatedAt: new Date(prismaGroup.updatedAt),
    members: prismaGroup.members.map(toDomainUser),
  };
}

export class PrismaGroupRepository implements IGroupRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Group | null> {
    const prismaGroup = await this.prisma.group.findUnique({
      where: { id },
      include: { members: true }, // Eager load members
    });
    return prismaGroup ? toDomainGroup(prismaGroup) : null;
  }

  async findByName(name: string): Promise<Group | null> {
    const prismaGroup = await this.prisma.group.findFirst({
      where: { name },
      include: { members: true },
    });
    return prismaGroup ? toDomainGroup(prismaGroup) : null;
  }

  async create(
    data: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'members'>,
    initialMemberIds: string[],
  ): Promise<Group> {
    const prismaGroup = await this.prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        members: {
          connect: initialMemberIds.map((userId) => ({ id: userId })),
        },
      },
      include: { members: true },
    });
    return toDomainGroup(prismaGroup);
  }

  async addMember(groupId: string, userId: string): Promise<Group | null> {
    // Check if user and group exist before attempting to connect if necessary,
    // or rely on Prisma to throw an error if IDs are invalid.
    try {
      const updatedPrismaGroup = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          members: {
            connect: { id: userId },
          },
        },
        include: { members: true },
      });
      return toDomainGroup(updatedPrismaGroup);
    } catch (error) {
      // Handle specific Prisma errors, e.g., P2025 (Record to update not found)
      // For now, rethrow or return null
      console.error(`Error adding member ${userId} to group ${groupId}:`, error);
      return null; 
    }
  }

  async removeMember(groupId: string, userId: string): Promise<Group | null> {
    try {
      const updatedPrismaGroup = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          members: {
            disconnect: { id: userId },
          },
        },
        include: { members: true },
      });
      return toDomainGroup(updatedPrismaGroup);
    } catch (error) {
      console.error(`Error removing member ${userId} from group ${groupId}:`, error);
      return null;
    }
  }

  // TODO: Implement other methods like update, delete, list, listByUserId as needed
}
