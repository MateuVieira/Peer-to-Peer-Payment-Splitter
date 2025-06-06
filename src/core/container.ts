import { prismaClient } from './database/index.js';

// User Feature Dependencies
import { PrismaUserRepository } from '../features/users/infrastructure/database/index.js';
import { UserService } from '../features/users/application/index.js';

// Group Feature Dependencies
import { PrismaGroupRepository } from '../features/groups/infrastructure/database/index.js';
import { GroupService } from '../features/groups/application/group.service.js';
import { PrismaSettlementRepository } from '../features/settlements/infrastructure/database/prismaSettlement.repository.js';
import { SettlementService } from '../features/settlements/application/settlement.service.js';
import { PrismaExpenseRepository } from '../features/expenses/infrastructure/database/prismaExpense.repository.js';
import { ExpenseService } from '../features/expenses/application/expense.service.js';


export const userRepository = new PrismaUserRepository(prismaClient);
export const groupRepository = new PrismaGroupRepository(prismaClient);
export const expenseRepository = new PrismaExpenseRepository(prismaClient);
export const settlementRepository = new PrismaSettlementRepository(prismaClient);

export const userService = new UserService(userRepository);
export const groupService = new GroupService(groupRepository, userRepository);
export const settlementService = new SettlementService(settlementRepository, groupRepository);
export const expenseService = new ExpenseService(expenseRepository, groupRepository);
