import { logger } from '../../../core/logger.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';
import type { IExpenseRepository, CreateExpenseData } from '../domain/expense.repository.js';
import { Expense, SplitType } from '../domain/expense.entity.js';
import type { IGroupRepository } from '../../groups/domain/group.repository.js';
import type { CreateExpenseDto } from './expense.schemas.js';
import { Group } from '../../groups/domain/index.js';
import { ParticipantShare, ISplitStrategy, SplitStrategyContext } from '../domain/splitStrategy.js';
import { EqualSplitStrategy } from '../domain/equalSplitStrategy.js';
import { PartialEqualSplitStrategy } from '../domain/partialEqualSplitStrategy.js';

export class ExpenseService {
  private readonly splitStrategies: Map<SplitType, ISplitStrategy>;

  constructor(
    private readonly expenseRepository: IExpenseRepository,
    private readonly groupRepository: IGroupRepository,
  ) {
    this.splitStrategies = new Map<SplitType, ISplitStrategy>();
    this.splitStrategies.set(SplitType.EQUAL, new EqualSplitStrategy());
    this.splitStrategies.set(SplitType.PARTIAL_EQUAL, new PartialEqualSplitStrategy());
  }

  private getGroupMemberIds(group: Group, requestingUserId: string, payerId: string): Set<string> {
    if (!group.members || group.members.length === 0) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: `Group with ID ${group.id} has no members.` });
    }
    const groupMemberIds = new Set(group.members.map(m => m.id));
    if (!groupMemberIds.has(requestingUserId)) {
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'Requesting user is not a member of the group.' });
    }
    if (!groupMemberIds.has(payerId)) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: `Payer with ID ${payerId} is not a member of the group.` });
    }
    return groupMemberIds;
  }

  private handleSplitPayment(
    groupMemberIds: Set<string>,
    splitType: SplitType,
    amount: number,
    involvedParticipantIds?: string[],
  ): ParticipantShare[] {
    const strategy = this.splitStrategies.get(splitType);

    if (!strategy) {
      logger.error(
        { splitTypeAttempted: splitType, method: 'handleSplitPayment' },
        'Unsupported or unknown split type encountered. No strategy found.',
      );
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Split type '${splitType}' is not currently supported for automated share calculation.`,
      });
    }

    const context: SplitStrategyContext = {
      amount,
      allGroupMemberIds: groupMemberIds,
      involvedParticipantIds,
    };
    return strategy.calculateShares(context);
  }

  async createExpense(data: CreateExpenseDto, requestingUserId: string): Promise<Expense> {
    const { amount, splitType, groupId, payerId, involvedParticipantIds } = data;

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({ httpCode: HttpCode.NOT_FOUND, description: `Group with ID ${groupId} not found.` });
    }
    const groupMemberIds = this.getGroupMemberIds(group, requestingUserId, payerId);

    const calculatedParticipants = this.handleSplitPayment(
      groupMemberIds,
      splitType,
      amount,
      involvedParticipantIds,
    );

    const expenseToCreate: CreateExpenseData = {
      ...data,
      participants: calculatedParticipants,
    };

    try {
      const createdExpense = await this.expenseRepository.create(expenseToCreate);

      logger.info({ expenseId: createdExpense.id, groupId: data.groupId }, 'Expense created successfully');
      
      return createdExpense;
    } catch (error) {
      logger.error({ error, expenseData: data }, 'Error creating expense in service');

      if (error instanceof AppError) throw error;

      throw new AppError({ httpCode: HttpCode.INTERNAL_SERVER_ERROR, description: 'Failed to create expense.' });
    }
  }

  async getExpenseById(id: string, requestingUserId: string): Promise<Expense> {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new AppError({ httpCode: HttpCode.NOT_FOUND, description: `Expense with ID ${id} not found.` });
    }

    const group = await this.groupRepository.findById(expense.groupId);
    if (!group || !group.members?.some(m => m.id === requestingUserId)) {
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'User not authorized to view this expense.' });
    }

    return expense;
  }

  async getExpensesByGroupId(groupId: string, requestingUserId: string): Promise<Expense[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({ httpCode: HttpCode.NOT_FOUND, description: `Group with ID ${groupId} not found.` });
    }

    if (!group.members?.some(m => m.id === requestingUserId)) {
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'User not authorized to view expenses for this group.' });
    }

    return this.expenseRepository.findByGroupId(groupId);
  }
}
