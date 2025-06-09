import { z } from "zod";

export const CreateSettlementSchema = z.object({
  groupId: z.string().uuid({ message: "Group ID must be a valid UUID." }),
  payerId: z.string().uuid({ message: "Payer ID must be a valid UUID." }),
  payeeId: z.string().uuid({ message: "Payee ID must be a valid UUID." }),
  amount: z
    .number({ required_error: "Amount is required." })
    .int({ message: "Amount must be an integer (in cents)." })
    .positive({ message: "Amount must be a positive number." }),
  currency: z
    .string()
    .min(3)
    .max(3)
    .optional()
    .transform((val) => (val ? val.toUpperCase() : undefined)), // Optional, 3-letter code
});

export type CreateSettlementDto = z.infer<typeof CreateSettlementSchema>;

export const GetByIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Settlement ID must be a valid UUID." }),
});
export type GetByIdParamsDto = z.infer<typeof GetByIdParamsSchema>;

export const GetByGroupIdParamsSchema = z.object({
  groupId: z.string().uuid({ message: "Group ID must be a valid UUID." }),
});
export type GetByGroupIdParamsDto = z.infer<typeof GetByGroupIdParamsSchema>;

export const GetByGroupIdQuerySchema = z.object({
  requestingUserId: z.string().uuid({ message: "Requesting User ID must be a valid UUID." }),
});
export type GetByGroupIdQueryDto = z.infer<typeof GetByGroupIdQuerySchema>;

export const GetByUserInGroupParamsSchema = z.object({
  userId: z.string().uuid({ message: "User ID must be a valid UUID." }),
  groupId: z.string().uuid({ message: "Group ID must be a valid UUID." }),
});
export type GetByUserInGroupParamsDto = z.infer<typeof GetByUserInGroupParamsSchema>;
