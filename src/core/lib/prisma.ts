// Centralized Prisma client export
import { PrismaClient } from "../../generated/prisma/index.js";

export * from "../../generated/prisma/index.js";

const prismaClient: PrismaClient = new PrismaClient();
export default prismaClient;
