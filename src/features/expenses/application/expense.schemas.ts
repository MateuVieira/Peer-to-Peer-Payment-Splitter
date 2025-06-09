import { z } from "zod";
import { SplitType } from "../domain/expense.entity.js";

export const CreateExpenseParticipantSchema = z.object({
  participantId: z.string().uuid({ message: "Participant ID must be a valid UUID." }),
  shareAmount: z
    .number()
    .int()
    .min(0, { message: "Share amount must be a non-negative integer (cents)." }),
});

export const CreateExpenseSchema = z.object({
  description: z.string().trim().min(1, { message: "Description cannot be empty." }),
  amount: z.number().int().positive({ message: "Amount must be a positive integer (cents)." }),
  currency: z
    .string()
    .length(3, { message: "Currency must be a 3-letter code." })
    .regex(/^[A-Z]+$/, { message: "Currency must be uppercase letters." })
    .default("USD"),
  expenseDate: z.coerce.date({ message: "Invalid date format for expense date." }),
  splitType: z.nativeEnum(SplitType, { message: "Invalid split type." }),
  groupId: z.string().uuid({ message: "Group ID must be a valid UUID." }),
  payerId: z.string().uuid({ message: "Payer ID must be a valid UUID." }),
  involvedParticipantIds: z.array(z.string().uuid()).optional(),
  requestingUserId: z.string().uuid({ message: "Requesting User ID must be a valid UUID." }),
});

export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;

export const GetExpenseByIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Expense ID must be a valid UUID." }),
});

export type GetExpenseByIdParamsDto = z.infer<typeof GetExpenseByIdParamsSchema>;

export const GetExpensesByGroupIdParamsSchema = z.object({
  groupId: z.string().uuid({ message: "Group ID must be a valid UUID." }),
});

export type GetExpensesByGroupIdParamsDto = z.infer<typeof GetExpensesByGroupIdParamsSchema>;
