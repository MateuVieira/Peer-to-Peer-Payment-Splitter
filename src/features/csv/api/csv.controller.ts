import express, { Request, Response, NextFunction, Router } from "express";
import { CsvService } from "../application/csv.service.js";
import { validateRequest, validateParams } from "../../../core/middleware/validation.middleware.js";
import {
  initiateUploadSchema,
  type InitiateUploadBodyDto,
  processCsvSchema,
  type ProcessCsvParamsDto,
  getJobStatusSchema,
  type GetJobStatusParamsDto,
} from "./csv.schemas.js";

export function createCsvRouter(csvProcessingService: CsvService): Router {
  const router = express.Router();

  // Generate presigned URL for CSV upload
  router.post(
    "/upload",
    validateRequest(initiateUploadSchema.shape.body),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { fileName, requestingUserId } = req.body as InitiateUploadBodyDto;
        const result = await csvProcessingService.initiateUpload(fileName, requestingUserId);

        res.status(200).json({
          success: true,
          data: result,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Trigger CSV processing after upload
  router.post(
    "/:jobId/uploadCompleted",
    validateParams(processCsvSchema.shape.params),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { jobId } = req.params as ProcessCsvParamsDto;

        void csvProcessingService
          .confirmUploadAndInitiateProcessing(jobId)
          .catch((error: unknown) => {
            console.error("Error processing CSV file:", error);
          });

        res.status(202).json({
          success: true,
          message: "CSV processing started.",
          jobId,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Get job status
  router.get(
    "/:jobId",
    validateParams(getJobStatusSchema.shape.params),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { jobId } = req.params as GetJobStatusParamsDto;
        const result = await csvProcessingService.getJobStatus(jobId);

        res.status(200).json({
          success: true,
          data: result,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
