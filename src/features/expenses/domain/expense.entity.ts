import type { User } from "../../users/domain/user.entity.js";
import type { Group } from "../../groups/domain/group.entity.js";

export enum SplitType {
  EQUAL = "EQUAL",
  PARTIAL_EQUAL = "PARTIAL_EQUAL",
}

export interface ExpenseParticipant {
  id: string;
  expenseId: string;
  participantId: string;
  participant?: Partial<User>;
  shareAmount: number; // Amount in cents
}

export interface Expense {
  id: string;
  description: string;
  amount: number; // Amount in cents
  currency: string;
  expenseDate: Date;
  splitType: SplitType;
  createdAt: Date;
  updatedAt: Date;

  groupId: string;
  group?: Partial<Group>;
  payerId: string;
  payer?: Partial<User>;

  participants: ExpenseParticipant[];
}

export interface ExpenseCompletedPayload {
  [key: string]: unknown;
  expenseId: string;
}
