import type { User } from "../../users/domain/user.entity.js";
import type { Group } from "../../groups/domain/group.entity.js";

export interface Settlement {
  id: string;
  amount: number; // Amount in cents
  currency: string;
  settlementDate: Date;
  createdAt: Date;

  groupId: string;
  group?: Partial<Group>;

  payerId: string;
  payer?: Partial<User>;

  payeeId: string;
  payee?: Partial<User>;
}

export interface SettlementCompletedPayload {
  [key: string]: unknown;
  settlementId: string;
}
