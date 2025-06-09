import { PrismaClient, Prisma, $Enums } from '../../../generated/prisma/index.js';
import { CsvProcessingJob, CsvCommandResult, CsvJobStatus } from '../domain/csv.entity.js';
import { ICsvRepository } from '../domain/csv.repository.js';
import { logger } from '../../../core/logger.js';

type PrismaJobWithResults = Prisma.CsvProcessingJobGetPayload<{
  include: { commandResults: true };
}>;

type PrismaCommandResult = Prisma.CsvCommandResultGetPayload<null>;

export class PrismaCsvRepository implements ICsvRepository {
  constructor(private prisma: PrismaClient) {}

  private _toDomainJob(prismaJob: PrismaJobWithResults): CsvProcessingJob {
    const { createdById, commandResults, ...rest } = prismaJob;
    return {
      ...rest,
      createdBy: createdById,
      commandResults: commandResults ? commandResults.map((cr: PrismaCommandResult) => ({ ...cr } as CsvCommandResult)) : [],
    } as CsvProcessingJob;
  }

  async createJob(jobData: Omit<CsvProcessingJob,  'createdAt' | 'updatedAt' | 'status' | 'commandResults'> & { status?: CsvJobStatus }): Promise<CsvProcessingJob> {
    try {
      const job = await this.prisma.csvProcessingJob.create({
        data: {
          fileName: jobData.fileName,
          s3Key: jobData.s3Key,
          bucketName: jobData.bucketName,
          createdById: jobData.createdBy,
          status: (jobData.status || CsvJobStatus.PENDING) as $Enums.CsvJobStatus,
          ...(jobData.id && { id: jobData.id }),
          ...(jobData.totalCommands && { totalCommands: jobData.totalCommands }),
          ...(jobData.processedCommands && { processedCommands: jobData.processedCommands }),
          ...(jobData.failedCommands && { failedCommands: jobData.failedCommands }),
          ...(jobData.errorMessage && { errorMessage: jobData.errorMessage }),
          ...(jobData.processingStartedAt && { processingStartedAt: jobData.processingStartedAt }),
          ...(jobData.completedAt && { completedAt: jobData.completedAt }),
        },
      });
      
      const createdJobWithResults = await this.prisma.csvProcessingJob.findUnique({
        where: { id: job.id },
        include: { commandResults: true },
      });
      
      if (!createdJobWithResults) {
        logger.error(`Failed to fetch job ${job.id} with results after creation.`);
        
        throw new Error(`Failed to fetch job ${job.id} with results after creation.`);
      }
      return this._toDomainJob(createdJobWithResults);
    } catch (error) {
      logger.error('Error creating CSV processing job:', { error, jobData });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma errors (e.g., unique constraint violation)
      }

      throw error;
    }
  }

  async findJobById(id: string): Promise<CsvProcessingJob | null> {
    const job = await this.prisma.csvProcessingJob.findUnique({
      where: { id },
      include: { commandResults: true },
    });
    return job ? this._toDomainJob(job) : null;
  }

  async findJobsByUserId(userId: string): Promise<CsvProcessingJob[]> {
    const jobs = await this.prisma.csvProcessingJob.findMany({
      where: { createdById: userId },
      include: { commandResults: true },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map(job => this._toDomainJob(job));
  }

  async updateJob(id: string, data: Partial<Omit<CsvProcessingJob, 'id' | 'createdAt'>>): Promise<CsvProcessingJob> {
    const job = await this.prisma.csvProcessingJob.update({
      where: { id },
      data: (() => {
        const { createdBy: createdByUserId, ...restOfData } = data;
        const prismaDataUpdate: Prisma.CsvProcessingJobUpdateInput = { ...restOfData } as Prisma.CsvProcessingJobUpdateInput;

        if (createdByUserId) {
          prismaDataUpdate.createdBy = { 
            connect: { id: createdByUserId }
          };
        }
        return prismaDataUpdate;
      })(),
      include: { commandResults: true },
    });
    return this._toDomainJob(job);
  }

  async saveCommandResult(resultData: Omit<CsvCommandResult, 'id'>): Promise<CsvCommandResult> {
    const { jobId, ...restOfResultData } = resultData;
    const result = await this.prisma.csvCommandResult.create({
      data: {
        ...restOfResultData,
        job: { 
          connect: { id: jobId },
        },
      },
    });
    return result as CsvCommandResult;
  }

  async findCommandResultsByJobId(jobId: string): Promise<CsvCommandResult[]> {
    const results = await this.prisma.csvCommandResult.findMany({
      where: { jobId },
      orderBy: { lineNumber: 'asc' },
    });
    return results.map(r => r as CsvCommandResult);
  }
}
