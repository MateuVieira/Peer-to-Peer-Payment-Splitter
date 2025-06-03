import { PrismaClient, User as PrismaUser } from '../../../../generated/prisma/index.js';
import { IUserRepository } from '../../domain/user.repository.js';
import { User } from '../../domain/user.entity.js';

// Helper function to map PrismaUser to our domain User entity.
// This is useful if your domain entity structure diverges from the Prisma model.
function toDomainUser(prismaUser: PrismaUser): User {
  return {
    ...prismaUser,
    // Prisma typically returns Date objects, but explicit conversion can be a safeguard.
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

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const prismaUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
      },
    });
    return toDomainUser(prismaUser);
  }

  // TODO: Implement other methods like update, delete, list as needed
}
