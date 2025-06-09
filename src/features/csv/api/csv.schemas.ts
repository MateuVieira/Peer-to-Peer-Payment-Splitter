import { z } from 'zod';

export const initiateUploadSchema = z.object({
  body: z.object({
    fileName: z.string({
      required_error: 'File name is required.',
      invalid_type_error: 'File name must be a string.',
    }).min(1, { message: 'File name cannot be empty.' }),
    requestingUserId: z.string({
      required_error: 'User ID is required.',
      invalid_type_error: 'User ID must be a string.',
    }).min(1, { message: 'User ID cannot be empty.' }),
  }),
});
export type InitiateUploadBodyDto = z.infer<typeof initiateUploadSchema>['body'];

export const processCsvSchema = z.object({
  params: z.object({
    jobId: z.string({
      required_error: 'Job ID is required in the path.',
      invalid_type_error: 'Job ID must be a string.',
    }).min(1, { message: 'Job ID cannot be empty.' }),
  }),
});
export type ProcessCsvParamsDto = z.infer<typeof processCsvSchema>['params'];

export const getJobStatusSchema = z.object({
  params: z.object({
    jobId: z.string({
      required_error: 'Job ID is required in the path.',
      invalid_type_error: 'Job ID must be a string.',
    }).min(1, { message: 'Job ID cannot be empty.' }),
  }),
});
export type GetJobStatusParamsDto = z.infer<typeof getJobStatusSchema>['params'];
