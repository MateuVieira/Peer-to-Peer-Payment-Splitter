import { PrismaClient, User as PrismaUser } from "../../../../generated/prisma/index.js";
import { logger } from "@core/index.js";
import { IUserRepository } from "@features/users/domain/user.repository.js";
import { User } from "@features/users/domain/user.entity.js";

function toDomainUser(prismaUser: PrismaUser): User {
  return {
    ...prismaUser,
    createdAt: new Date(prismaUser.createdAt),
    updatedAt: new Date(prismaUser.updatedAt),
  };
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { id },
    });
    return prismaUser ? toDomainUser(prismaUser) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { email },
    });
    return prismaUser ? toDomainUser(prismaUser) : null;
  }

  async create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const prismaUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
      },
    });
    return toDomainUser(prismaUser);
  }

  async update(
    userId: string,
    data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>
  ): Promise<User | null> {
    try {
      const prismaUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          updatedAt: new Date(),
        },
      });
      return toDomainUser(prismaUser);
    } catch (error) {
      logger.error({ err: error, userId, data }, `Error updating user ${userId}`);
      return null;
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      logger.error({ err: error, userId }, `Error deleting user ${userId}`);
      throw error;
    }
  }
}
