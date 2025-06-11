import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError, HttpCode } from "@core/error/index.js";

const handleZodError = (error: unknown, next: NextFunction) => {
  if (error instanceof ZodError) {
    const errorMessages = error.errors
      .map((err) => `${err.path.join(".") || "object"}: ${err.message}`)
      .join("; ");
    const appError = new AppError({
      httpCode: HttpCode.BAD_REQUEST,
      description: `Validation failed. Issues: ${errorMessages}`,
      isOperational: true,
    });
    next(appError);
  } else {
    const appError = new AppError({
      httpCode: HttpCode.INTERNAL_SERVER_ERROR,
      description: "An unexpected error occurred during validation.",
      isOperational: true,
    });
    next(appError);
  }
};

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      handleZodError(error, next);
    }
  };
};

export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      handleZodError(error, next);
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      handleZodError(error, next);
    }
  };
};
