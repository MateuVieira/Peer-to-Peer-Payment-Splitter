import { prismaClient } from './database/index.js';

// User Feature Dependencies
import { PrismaUserRepository } from '../features/users/infrastructure/database/index.js';
import { UserService } from '../features/users/application/index.js';

// Group Feature Dependencies
import { PrismaGroupRepository } from '../features/groups/infrastructure/database/index.js';
import { GroupService } from '../features/groups/application/index.js';

export const userRepository = new PrismaUserRepository(prismaClient);
export const groupRepository = new PrismaGroupRepository(prismaClient);

export const userService = new UserService(userRepository);
export const groupService = new GroupService(groupRepository, userRepository);
