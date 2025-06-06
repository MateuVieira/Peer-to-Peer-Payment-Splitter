import type { Settlement } from '../domain/settlement.entity.js';
import type { CreateSettlementData, ISettlementRepository } from '../domain/settlement.repository.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';
import type { IGroupRepository } from '../../groups/domain/group.repository.js';
import { logger } from '../../../core/logger.js';

export class SettlementService {
  constructor(
    private readonly settlementRepository: ISettlementRepository,
    private readonly groupRepository: IGroupRepository,
  ) {}

  async createSettlement(data: CreateSettlementData, requestingUserId: string): Promise<Settlement> {
    const group = await this.groupRepository.findById(data.groupId);
    if (!group) {
      logger.warn(`Attempt to create settlement for non-existent group: ${data.groupId}`);
      throw new AppError({ httpCode: HttpCode.NOT_FOUND, description: `Group with ID ${data.groupId} not found.` });
    }

    const isUserInGroup = group.members?.some(member => member.id === requestingUserId);
    if (!isUserInGroup) {
      logger.warn(`User ${requestingUserId} attempt to create settlement in group ${data.groupId} without membership`);
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'User is not a member of the specified group.' });
    }

    const isPayerInGroup = group.members?.some(member => member.id === data.payerId);
    if (!isPayerInGroup) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Payer is not a member of the specified group.' });
    }
    
    const isPayeeInGroup = group.members?.some(member => member.id === data.payeeId);
    if (!isPayeeInGroup) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Payee is not a member of the specified group.' });
    }

    if (data.payerId === data.payeeId) {
        throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'Payer and payee cannot be the same user.' });
    }

    return this.settlementRepository.create(data);
  }

  async getSettlementById(id: string, requestingUserId: string): Promise<Settlement | null> {
    const settlement = await this.settlementRepository.findById(id);
    if (!settlement) return null;

    const group = await this.groupRepository.findById(settlement.groupId);
    if (!group || !group.members?.some(member => member.id === requestingUserId)) {
      logger.warn(`User ${requestingUserId} attempt to access unauthorized settlement ${id}`);
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'User is not authorized to view this settlement.' });
    }

    return settlement;
  }

  async getSettlementsByGroupId(groupId: string, requestingUserId: string): Promise<Settlement[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group || !group.members?.some(member => member.id === requestingUserId)) {
      logger.warn(`User ${requestingUserId} attempt to access unauthorized settlements for group ${groupId}`);
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'User is not authorized to view settlements for this group.' });
    }

    return this.settlementRepository.findByGroupId(groupId);
  }

  async getSettlementsForUserInGroup(userId: string, groupId: string, requestingUserId: string): Promise<Settlement[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group || !group.members?.some(member => member.id === requestingUserId)) {
      logger.warn(`User ${requestingUserId} attempt to access unauthorized user settlements for group ${groupId}`);
      throw new AppError({ httpCode: HttpCode.FORBIDDEN, description: 'User is not authorized to view these settlements.' });
    }

    const isTargetUserInGroup = group.members?.some(member => member.id === userId);
    if (!isTargetUserInGroup) {
        throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: `User ${userId} is not a member of group ${groupId}.` });
    }

    return this.settlementRepository.findByUserInGroup(userId, groupId);
  }
}
