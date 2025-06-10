import { PrismaClient } from "../generated/prisma/index.js";

const prismaClient = new PrismaClient();

// User Feature Dependencies
import { PrismaUserRepository } from "../features/users/infrastructure/database/index.js";
import { UserService } from "../features/users/application/index.js";

// Group Feature Dependencies
import { PrismaGroupRepository } from "../features/groups/infrastructure/database/index.js";
import { GroupService } from "../features/groups/application/group.service.js";
import { SqsProducerService } from "./lib/aws/sqs.producer.service.js";
import type { IQueueProducer } from "./events/event-producer.interface.js";
import { PrismaSettlementRepository } from "../features/settlements/infrastructure/database/prismaSettlement.repository.js";
import { SettlementService } from "../features/settlements/application/settlement.service.js";
import { PrismaExpenseRepository } from "../features/expenses/infrastructure/database/prismaExpense.repository.js";
import { ExpenseService } from "../features/expenses/application/expense.service.js";
import { PrismaCsvRepository } from "../features/csv/infrastructure/PrismaCsvRepository.js";
import { CsvService } from "../features/csv/application/csv.service.js";
import { NotificationService } from "../features/notifications/application/notification.service.js";
import { PrismaNotificationLogRepository } from "../features/notifications/infrastructure/prismaNotificationLog.repository.js";
import { S3Service } from "./lib/aws/s3.service.js";
import { ProcessService } from "../features/csv/application/process.service.js";
import { ICommandStrategy } from "../features/csv/domain/command.strategy.types.js";
import { CreateExpenseStrategy } from "../features/csv/application/create-expense.strategy.js";
import { CreateSettlementStrategy } from "../features/csv/application/create-settlement.strategy.js";
import { SESService } from "./lib/aws/ses.service.js";

export const userRepository = new PrismaUserRepository(prismaClient);
export const groupRepository = new PrismaGroupRepository(prismaClient);
export const expenseRepository = new PrismaExpenseRepository(prismaClient);
export const settlementRepository = new PrismaSettlementRepository(prismaClient);
export const csvProcessingRepository = new PrismaCsvRepository(prismaClient);
export const notificationLogRepository = new PrismaNotificationLogRepository(prismaClient);

export const queueProducerService: IQueueProducer = new SqsProducerService();
export const s3Service = new S3Service();
export const sesService = new SESService();

export const userService = new UserService(userRepository);
export const groupService = new GroupService(groupRepository, userRepository);
export const settlementService = new SettlementService(
  settlementRepository,
  groupRepository,
  queueProducerService,
  userService
);
export const expenseService = new ExpenseService(
  expenseRepository,
  groupRepository,
  queueProducerService,
  userService
);
export const notificationService = new NotificationService(sesService, notificationLogRepository);
export const csvProcessingStrategies: ICommandStrategy[] = [
  new CreateExpenseStrategy(expenseService),
  new CreateSettlementStrategy(settlementService),
  // TODO: Add strategies
];

export const processService = new ProcessService(csvProcessingStrategies);
export const csvProcessingService = new CsvService(
  csvProcessingRepository,
  s3Service,
  queueProducerService,
  processService,
  userService
);
