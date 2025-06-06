import {
  PrismaClient,
  Prisma,
  Group as PrismaGroupModel,
  User as PrismaUserModel,
} from '../../../../generated/prisma/index.js';
import { IGroupRepository, PaginatedGroupsResult, PaginationParams } from '../../domain/group.repository.js';
import { logger } from '../../../../core/index.js';
import { PrismaErrorCodes } from '../../../../core/database/prisma.errors.js';
import { Group } from '../../domain/group.entity.js';
import { User } from '../../../users/domain/user.entity.js';

function toDomainUser(prismaUser: PrismaUserModel): User {
  return {
    id: prismaUser.id,
    name: prismaUser.name,
    email: prismaUser.email,
    createdAt: new Date(prismaUser.createdAt),
    updatedAt: new Date(prismaUser.updatedAt),
  };
}

function toDomainGroup(
  prismaGroup: PrismaGroupModel & { members: PrismaUserModel[] },
): Group {
  return {
    id: prismaGroup.id,
    name: prismaGroup.name,
    description: prismaGroup.description ?? undefined,
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
      include: { members: true },
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
      logger.error({ err: error, groupId, userId }, `Error adding member ${userId} to group ${groupId}`);
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
      logger.error({ err: error, groupId, userId }, `Error removing member ${userId} from group ${groupId}`);
      return null;
    }
  }

  async update(groupId: string, data: Partial<Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'members'>>): Promise<Group | null> {
    try {
      const updatedPrismaGroup = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          name: data.name,
          description: data.description,
        },
        include: { members: true },
      });
      return toDomainGroup(updatedPrismaGroup);
    } catch (error) {
      logger.error({ err: error, groupId, data }, `Error updating group ${groupId}`);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PrismaErrorCodes.RECORD_NOT_FOUND) {
          return null;
        }
      }
      throw error;
    }
  }

  async delete(groupId: string): Promise<boolean> {
    try {
      await this.prisma.group.delete({
        where: { id: groupId },
      });
      return true;
    } catch (error) {
      logger.error({ err: error, groupId }, `Error deleting group ${groupId}`);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PrismaErrorCodes.RECORD_NOT_FOUND) {
          return false;
        }
      }
      return false; 
    }
  }

  async findAll(params: PaginationParams): Promise<PaginatedGroupsResult> {
    try {
      const { page, limit } = params;
      const skip = (page - 1) * limit;

      const [prismaGroups, total] = await this.prisma.$transaction([
        this.prisma.group.findMany({
          skip: skip,
          take: limit,
          include: { members: true },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.group.count(),
      ]);

      return {
        groups: prismaGroups.map(toDomainGroup),
        total,
      };
    } catch (error) {
      logger.error({ err: error }, 'Error fetching all groups');
      throw error;
    }
  }
}
