import type { Settlement } from './settlement.entity.js';

export interface CreateSettlementData {
  amount: number; // in cents
  currency?: string;
  settlementDate: Date;
  groupId: string;
  payerId: string;
  payeeId: string;
}

export interface ISettlementRepository {
  create(data: CreateSettlementData): Promise<Settlement>;
  findById(id: string): Promise<Settlement | null>;
  findByGroupId(groupId: string): Promise<Settlement[]>;
  findByUserInGroup(userId: string, groupId: string): Promise<Settlement[]>;
}
