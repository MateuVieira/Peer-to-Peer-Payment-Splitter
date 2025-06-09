import { CsvProcessingJob, CsvCommandResult } from './csv.entity.js';

export interface ICsvRepository {
  createJob(job: Omit<CsvProcessingJob, 'createdAt' | 'updatedAt'>): Promise<CsvProcessingJob>;
  findJobById(id: string): Promise<CsvProcessingJob | null>;
  findJobsByUserId(userId: string): Promise<CsvProcessingJob[]>;
  updateJob(id: string, data: Partial<CsvProcessingJob>): Promise<CsvProcessingJob>;
  
  saveCommandResult(result: Omit<CsvCommandResult, 'id'>): Promise<CsvCommandResult>;
  findCommandResultsByJobId(jobId: string): Promise<CsvCommandResult[]>;
}