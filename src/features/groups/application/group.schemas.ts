import { z } from 'zod';

export const CreateGroupSchema = z.object({
  name: z.string({
    required_error: 'Group name is required.',
    invalid_type_error: 'Group name must be a string.',
  }).min(1, { message: 'Group name cannot be empty.' }),
  description: z.string({
    invalid_type_error: 'Description must be a string.',
  }).optional(),
  initialMemberIds: z.array(
    z.string({
      invalid_type_error: 'Each member ID in initialMemberIds must be a string.',
    }).min(1, { message: 'Member ID in initialMemberIds cannot be empty.' }),
    {
      required_error: 'initialMemberIds array is required.',
      invalid_type_error: 'initialMemberIds must be an array of strings.',
    }
  ).min(0, { message: 'initialMemberIds array can be empty.' }),
});

export const ModifyGroupMemberSchema = z.object({ 
  groupId: z.string({
    required_error: 'Group ID is required.',
    invalid_type_error: 'Group ID must be a string.',
  }).min(1, { message: 'Group ID cannot be empty.' }),
  userId: z.string({
    required_error: 'User ID is required.',
    invalid_type_error: 'User ID must be a string.',
  }).min(1, { message: 'User ID cannot be empty.' }),
});

export type CreateGroupValidationDto = z.infer<typeof CreateGroupSchema>;
export type ModifyGroupMemberValidationDto = z.infer<typeof ModifyGroupMemberSchema>;

export const UpdateGroupSchema = z.object({
  name: z.string({
    invalid_type_error: 'Group name must be a string.',
  }).min(1, { message: 'Group name cannot be empty.' }).optional(),
  description: z.string({
    invalid_type_error: 'Description must be a string.',
  }).nullable().optional(),
});

export type UpdateGroupValidationDto = z.infer<typeof UpdateGroupSchema>;
