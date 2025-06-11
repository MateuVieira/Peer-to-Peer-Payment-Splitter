import { PrismaClient, Prisma } from "../../../../generated/prisma/index.js";
import type { Expense, ExpenseParticipant } from "@features/expenses/domain/expense.entity.js";
import type { IExpenseRepository, CreateExpenseData } from "@features/expenses/domain/expense.repository.js";
import { AppError, HttpCode } from "@core/error/app.error.js";
import { PrismaErrorCodes } from "@core/database/prisma.errors.js";
import { SplitType as DomainSplitType } from "@features/expenses/domain/expense.entity.js";
import type { User } from "@features/users/domain/user.entity.js";
import { mapAuditableEntity } from "@core/database/prisma.mappers.js";

type PrismaExpenseWithDetails = Prisma.ExpenseGetPayload<{
  include: {
    participants: { include: { participant: true } };
    group: true;
    payer: true;
  };
}>;

export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateExpenseData): Promise<Expense> {
    const { participants, ...expenseData } = data;

    // Assuming amounts in CreateExpenseData are already in cents as per interface definition
    const amountInCents = Math.round(expenseData.amount);
    const participantsInCents = participants.map((p) => ({
      participantId: p.participantId,
      shareAmount: Math.round(p.shareAmount),
    }));

    try {
      const createdExpense = await this.prisma.expense.create({
        data: {
          ...expenseData,
          amount: amountInCents,
          participants: {
            create: participantsInCents,
          },
        },
        include: {
          participants: { include: { participant: true } },
          group: true,
          payer: true,
        },
      });

      return this.mapPrismaExpenseToDomain(createdExpense);
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
            description: `Failed to create expense: Invalid group, payer, or participant ID. Details: ${errorMessage}`,
            isOperational: true,
          });
        }
      }

      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Error creating expense in database: ${errorMessage}`,
      });
    }
  }

  async findById(id: string): Promise<Expense | null> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        participants: { include: { participant: true } },
        group: true,
        payer: true,
      },
    });

    if (!expense) return null;

    return this.mapPrismaExpenseToDomain(expense);
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      include: {
        participants: { include: { participant: true } },
        group: true,
        payer: true,
      },
      orderBy: {
        expenseDate: "desc",
      },
    });

    return expenses.map((expense) => this.mapPrismaExpenseToDomain(expense));
  }

  private mapPrismaExpenseToDomain(prismaExpense: PrismaExpenseWithDetails): Expense {
    const domainExpense: Expense = {
      ...prismaExpense,
      expenseDate: new Date(prismaExpense.expenseDate),
      splitType: prismaExpense.splitType as DomainSplitType,
      createdAt: new Date(prismaExpense.createdAt),
      updatedAt: new Date(prismaExpense.updatedAt),
      group: mapAuditableEntity(prismaExpense.group),
      payer: mapAuditableEntity(prismaExpense.payer),
      participants: prismaExpense.participants.map((p) => {
        const domainParticipant: ExpenseParticipant = {
          ...p,
          participant: mapAuditableEntity(p.participant) as Partial<User> | undefined,
        };

        return domainParticipant;
      }),
    };

    return domainExpense;
  }
}
