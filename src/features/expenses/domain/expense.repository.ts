import type { Expense, SplitType } from './expense.entity.js';

export interface CreateExpenseData {
  description: string;
  amount: number; // in cents
  currency?: string;
  expenseDate: Date;
  splitType?: SplitType;
  groupId: string;
  payerId: string;
  participants: Array<{
    participantId: string;
    shareAmount: number; // in cents
  }>;
}

export interface IExpenseRepository {
  create(data: CreateExpenseData): Promise<Expense>;
  findById(id: string): Promise<Expense | null>;
  findByGroupId(groupId: string): Promise<Expense[]>;
}
