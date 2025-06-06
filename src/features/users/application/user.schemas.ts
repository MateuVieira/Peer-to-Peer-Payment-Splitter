import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string({
    required_error: 'Email is required.',
    invalid_type_error: 'Email must be a string.',
  }).email({ message: 'Invalid email address.' }).min(1, { message: 'Email cannot be empty.' }),
  name: z.string({
    required_error: 'Name is required.',
    invalid_type_error: 'Name must be a string.',
  }).min(1, { message: 'Name cannot be empty.' }),
});

export type CreateUserValidationDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string({
    invalid_type_error: 'Name must be a string.',
  }).min(1, { message: 'Name cannot be empty.' }).optional(),
});

export type UpdateUserValidationDto = z.infer<typeof UpdateUserSchema>;
