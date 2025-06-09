import { logger } from "../../../core/logger.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import type { IExpenseRepository, CreateExpenseData } from "../domain/expense.repository.js";
import { Expense, ExpenseCompletedPayload, SplitType } from "../domain/expense.entity.js";
import type { IGroupRepository } from "../../groups/domain/group.repository.js";
import type { CreateExpenseDto } from "./expense.schemas.js";
import { Group } from "../../groups/domain/index.js";
import { ParticipantShare, ISplitStrategy, SplitStrategyContext } from "../domain/splitStrategy.js";
import { EqualSplitStrategy } from "../domain/equalSplitStrategy.js";
import { PartialEqualSplitStrategy } from "../domain/partialEqualSplitStrategy.js";
import { IQueueProducer } from "../../../core/events/event-producer.interface.js";
import { Topic } from "../../../core/events/topics.js";
import { UserService } from "../../users/application/index.js";

export class ExpenseService {
  private readonly splitStrategies: Map<SplitType, ISplitStrategy>;

  constructor(
    private readonly expenseRepository: IExpenseRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly producerService: IQueueProducer,
    private readonly userService: UserService
  ) {
    this.splitStrategies = new Map<SplitType, ISplitStrategy>();
    this.splitStrategies.set(SplitType.EQUAL, new EqualSplitStrategy());
    this.splitStrategies.set(SplitType.PARTIAL_EQUAL, new PartialEqualSplitStrategy());
  }

  private getGroupMemberIds(group: Group, requestingUserId: string, payerId: string): Set<string> {
    if (!group.members || group.members.length === 0) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Group with ID ${group.id} has no members.`,
      });
    }
    const groupMemberIds = new Set(group.members.map((m) => m.id));
    if (!groupMemberIds.has(requestingUserId)) {
      throw new AppError({
        httpCode: HttpCode.FORBIDDEN,
        description: "Requesting user is not a member of the group.",
      });
    }
    if (!groupMemberIds.has(payerId)) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `Payer with ID ${payerId} is not a member of the group.`,
      });
    }
    return groupMemberIds;
  }

  private handleSplitPayment(
    groupMemberIds: Set<string>,
    splitType: SplitType,
    amount: number,
    involvedParticipantIds?: string[]
  ): ParticipantShare[] {
    const strategy = this.splitStrategies.get(splitType);

    if (!strategy) {
      logger.error(
        { splitTypeAttempted: splitType, method: "handleSplitPayment" },
        "Unsupported or unknown split type encountered. No strategy found."
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

  async createExpense(data: CreateExpenseDto): Promise<Expense> {
    const {
      amount,
      splitType,
      groupId,
      payerId,
      involvedParticipantIds,
      requestingUserId,
      ...rest
    } = data;

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }
    const groupMemberIds = this.getGroupMemberIds(group, requestingUserId, payerId);

    const calculatedParticipants = this.handleSplitPayment(
      groupMemberIds,
      splitType,
      amount,
      involvedParticipantIds
    );

    const expenseToCreate: CreateExpenseData = {
      amount,
      splitType,
      groupId,
      payerId,
      ...rest,
      participants: calculatedParticipants,
    };

    try {
      const createdExpense = await this.expenseRepository.create(expenseToCreate);

      logger.info(
        { expenseId: createdExpense.id, groupId: data.groupId },
        "Expense created successfully"
      );

      await this.producerService.sendMessage(Topic.EXPENSE_CREATED, {
        expenseId: createdExpense.id,
      });

      return createdExpense;
    } catch (error) {
      logger.error({ error, expenseData: data }, "Error creating expense in service");

      if (error instanceof AppError) throw error;

      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: "Failed to create expense.",
      });
    }
  }

  async getExpenseById(id: string): Promise<Expense> {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Expense with ID ${id} not found.`,
      });
    }

    const group = await this.groupRepository.findById(expense.groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.FORBIDDEN,
        description: "User not authorized to view this expense.",
      });
    }

    return expense;
  }

  async getExpensesByGroupId(groupId: string): Promise<Expense[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }

    return this.expenseRepository.findByGroupId(groupId);
  }

  private async handleMessageParticipant(expense: Expense, participant: ParticipantShare) {
    const participantShareInDollars = (participant.shareAmount / 100).toFixed(2);

    const participantUser = await this.userService.getUserById(participant.participantId);
    if (!participantUser) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `User with ID ${participant.participantId} not found.`,
      });
    }

    const subject = `Expense '${expense.description}' Logged Successfully`;
    const body = `Hi ${participantUser.name}, \n\n
    You have been added to the expense '${expense.description}' for $${participantShareInDollars}. \n\n
    `;

    return { subject, body, email: participantUser.email };
  }

  async createMessageOfCreatedExpense(payload: ExpenseCompletedPayload): Promise<void> {
    logger.info(
      `Processing event to create notification messages for expenseId: ${payload.expenseId}`,
      { payload }
    );

    const expense = await this.expenseRepository.findById(payload.expenseId);
    if (!expense) {
      logger.error(`Expense not found for id: ${payload.expenseId}. Cannot send notifications.`, {
        expenseId: payload.expenseId,
      });
      return;
    }

    const notificationPromises = expense.participants.map(async (participant) => {
      try {
        const message = await this.handleMessageParticipant(expense, participant);

        await this.producerService.sendMessage(Topic.NOTIFICATION_SEND, {
          eventId: payload.expenseId,
          eventType: Topic.NOTIFICATION_SEND,
          ...message,
        });

        return { success: true, participantId: participant.participantId };
      } catch (error) {
        logger.error(
          `Failed to send notification for participant ${participant.participantId} in expense ${expense.id}: ${error instanceof Error ? error.message : String(error)}`,
          { expenseId: expense.id, participantId: participant.participantId, error }
        );

        return { success: false, participantId: participant.participantId, error };
      }
    });

    await Promise.all(notificationPromises);

    logger.info(
      `Finished processing event to create notification messages for expenseId: ${payload.expenseId}`
    );
  }
}
