import { PrismaClient, Prisma } from "../../../../generated/prisma/index.js";
import type { Settlement } from "../../domain/settlement.entity.js";
import type {
  ISettlementRepository,
  CreateSettlementData,
} from "../../domain/settlement.repository.js";
import { AppError, HttpCode } from "../../../../core/error/app.error.js";
import { PrismaErrorCodes } from "../../../../core/database/prisma.errors.js";
import { mapAuditableEntity } from "../../../../core/database/prisma.mappers.js";
import type { User } from "../../../users/domain/user.entity.js";

type PrismaSettlementWithDetails = Prisma.SettlementGetPayload<{
  include: {
    group: true;
    payer: true;
    payee: true;
  };
}>;

export class PrismaSettlementRepository implements ISettlementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateSettlementData): Promise<Settlement> {
    const amountInCents = Math.round(data.amount);

    try {
      const createdSettlement = await this.prisma.settlement.create({
        data: {
          ...data,
          amount: amountInCents,
        },
        include: {
          group: true,
          payer: true,
          payee: true,
        },
      });

      return this.mapPrismaSettlementToDomain(createdSettlement);
    } catch (e) {
      let errorMessage = "An unknown error occurred";
      if (e instanceof Error) {
        errorMessage = e.message;
      }

      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (
          e.code === PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT_FAILED ||
          e.code === PrismaErrorCodes.RECORD_NOT_FOUND
        ) {
          throw new AppError({
            httpCode: HttpCode.BAD_REQUEST,
            description: `Failed to create settlement: Invalid group, payer, or payee ID. Details: ${errorMessage}`,
            isOperational: true,
          });
        }
      }
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Error creating settlement in database: ${errorMessage}`,
      });
    }
  }

  async findById(id: string): Promise<Settlement | null> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        group: true,
        payer: true,
        payee: true,
      },
    });

    if (!settlement) return null;

    return this.mapPrismaSettlementToDomain(settlement);
  }

  async findByGroupId(groupId: string): Promise<Settlement[]> {
    const settlements = await this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        group: true,
        payer: true,
        payee: true,
      },
      orderBy: {
        settlementDate: "desc",
      },
    });

    return settlements.map((s) => this.mapPrismaSettlementToDomain(s));
  }

  async findByUserInGroup(userId: string, groupId: string): Promise<Settlement[]> {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        groupId: groupId,
        OR: [{ payerId: userId }, { payeeId: userId }],
      },
      include: {
        group: true,
        payer: true,
        payee: true,
      },
      orderBy: {
        settlementDate: "desc",
      },
    });

    return settlements.map((s) => this.mapPrismaSettlementToDomain(s));
  }

  private mapPrismaSettlementToDomain(prismaSettlement: PrismaSettlementWithDetails): Settlement {
    const domainSettlement: Settlement = {
      ...prismaSettlement,
      settlementDate: new Date(prismaSettlement.settlementDate),
      createdAt: new Date(prismaSettlement.createdAt),
      group: mapAuditableEntity(prismaSettlement.group),
      payer: mapAuditableEntity(prismaSettlement.payer) as Partial<User> | undefined,
      payee: mapAuditableEntity(prismaSettlement.payee) as Partial<User> | undefined,
    };
    return domainSettlement;
  }
}
