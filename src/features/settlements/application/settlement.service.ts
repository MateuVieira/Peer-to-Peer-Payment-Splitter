import type { Settlement, SettlementCompletedPayload } from "../domain/settlement.entity.js";
import type {
  CreateSettlementData,
  ISettlementRepository,
} from "../domain/settlement.repository.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import type { IGroupRepository } from "../../groups/domain/group.repository.js";
import { logger } from "../../../core/logger.js";
import { IQueueProducer } from "../../../core/events/event-producer.interface.js";
import { UserService } from "../../users/application/user.service.js";
import { Topic } from "../../../core/events/topics.js";

export class SettlementService {
  constructor(
    private readonly settlementRepository: ISettlementRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly producerService: IQueueProducer,
    private readonly userService: UserService
  ) {}

  async createSettlement(data: CreateSettlementData): Promise<Settlement> {
    const group = await this.groupRepository.findById(data.groupId);
    if (!group) {
      logger.warn(`Attempt to create settlement for non-existent group: ${data.groupId}`);
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${data.groupId} not found.`,
      });
    }

    const isPayerInGroup = group.members?.some((member) => member.id === data.payerId);
    if (!isPayerInGroup) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Payer is not a member of the specified group.",
      });
    }

    const isPayeeInGroup = group.members?.some((member) => member.id === data.payeeId);
    if (!isPayeeInGroup) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Payee is not a member of the specified group.",
      });
    }

    if (data.payerId === data.payeeId) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "Payer and payee cannot be the same user.",
      });
    }

    const createdSettlement = await this.settlementRepository.create(data);

    await this.producerService.sendMessage(Topic.SETTLEMENT_CREATED, {
      settlementId: createdSettlement.id,
    });

    return createdSettlement;
  }

  async getSettlementById(id: string): Promise<Settlement | null> {
    const settlement = await this.settlementRepository.findById(id);
    if (!settlement) return null;

    const group = await this.groupRepository.findById(settlement.groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${settlement.groupId} not found.`,
      });
    }

    return settlement;
  }

  async getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }

    return this.settlementRepository.findByGroupId(groupId);
  }

  async getSettlementsForUserInGroup(userId: string, groupId: string): Promise<Settlement[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `Group with ID ${groupId} not found.`,
      });
    }
    const isTargetUserInGroup = group.members?.some((member) => member.id === userId);
    if (!isTargetUserInGroup) {
      throw new AppError({
        httpCode: HttpCode.BAD_REQUEST,
        description: `User ${userId} is not a member of group ${groupId}.`,
      });
    }

    return this.settlementRepository.findByUserInGroup(userId, groupId);
  }

  private async handleMessageForUser(settlement: Settlement, userId: string) {
    const participantShareInDollars = (settlement.amount / 100).toFixed(2);

    const participantUser = await this.userService.getUserById(userId);
    if (!participantUser) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: `User with ID ${userId} not found.`,
      });
    }

    const subject = `Settlement from ${settlement.payerId} to ${settlement.payeeId} Logged Successfully`;
    const body = `Hi ${participantUser.name},

You have been added to the settlement from ${settlement.payerId} to ${settlement.payeeId} for $${participantShareInDollars}.
`;

    return { subject, body, email: participantUser.email };
  }

  async createMessageOfCreatedSettlement(payload: SettlementCompletedPayload): Promise<void> {
    logger.info(
      `Processing event to create notification messages for settlementId: ${payload.settlementId}`,
      { payload }
    );

    const settlement = await this.settlementRepository.findById(payload.settlementId);
    if (!settlement) {
      logger.error(
        `Settlement not found for id: ${payload.settlementId}. Cannot send notifications.`,
        {
          settlementId: payload.settlementId,
        }
      );
      return;
    }

    const notificationPromises = [
      { userId: settlement.payeeId, role: "payee" },
      { userId: settlement.payerId, role: "payer" },
    ].map(async ({ userId, role }) => {
      try {
        const message = await this.handleMessageForUser(settlement, userId);

        await this.producerService.sendMessage(Topic.NOTIFICATION_SEND, {
          eventId: payload.settlementId,
          eventType: Topic.NOTIFICATION_SEND,
          ...message,
        });

        return { success: true, userId, role };
      } catch (error) {
        logger.error(
          `Failed to send notification for ${role} ${userId} in settlement ${settlement.id}: ${error instanceof Error ? error.message : String(error)}`,
          { settlementId: settlement.id, userId, role, error }
        );
        return { success: false, userId, role, error };
      }
    });

    await Promise.all(notificationPromises);

    logger.info(
      `Finished processing event to create notification messages for settlementId: ${payload.settlementId}`
    );
  }
}
