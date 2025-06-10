// Centralized Prisma client export
import { PrismaClient } from "../../generated/prisma/index.js";

// Re-export all Prisma types and models
export * from "../../generated/prisma/index.js";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const prismaClient = new PrismaClient();
export default prismaClient;
