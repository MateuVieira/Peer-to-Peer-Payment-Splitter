import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError, HttpCode } from '../error/index.js';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => err.message).join(', ');
        const appError = new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: `Validation failed: ${errorMessages}`,
          isOperational: true,
        });
        next(appError);
      } else {
        const appError = new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: 'An unexpected error occurred during validation.',
        });
        next(appError);
      }
    }
  };
};
