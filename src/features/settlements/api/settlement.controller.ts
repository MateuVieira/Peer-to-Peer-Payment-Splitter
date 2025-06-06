import { Router, type Request, type Response, type NextFunction } from 'express';
import type { SettlementService } from '../application/settlement.service.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';
import type { CreateSettlementData } from '../domain/settlement.repository.js';
import { validateRequest, validateParams, validateQuery } from '../../../core/middleware/validation.middleware.js';
import {
  CreateSettlementSchema,
  type CreateSettlementDto,
  GetByIdParamsSchema,
  type GetByIdParamsDto,
  RequestingUserQuerySchema,
  type RequestingUserQueryDto,
  GetByGroupIdParamsSchema,
  type GetByGroupIdParamsDto,
  GetByGroupIdQuerySchema,
  type GetByGroupIdQueryDto,
  GetByUserInGroupParamsSchema,
  type GetByUserInGroupParamsDto,
  GetByUserInGroupQuerySchema,
  type GetByUserInGroupQueryDto,
} from '../application/settlement.schemas.js';
import type { Settlement } from '../domain/settlement.entity.js';

export const createSettlementRouter = (settlementService: SettlementService): Router => {
  const router = Router();

  // For POST, PUT, PATCH, or other methods where requestingUserId might be in the body
// and not part of the main Zod schema for the body.
const getRequestingUserId = (req: Request): string => {
  const body = req.body as { requestingUserId?: string }; // Type assertion for clarity
  const userId = body.requestingUserId;

  if (!userId) {
    throw new AppError({
      httpCode: HttpCode.UNAUTHORIZED,
      description: 'Requesting user ID is missing in the request body.',
    });
  }
  // We might also want to add a UUID check here if not relying on Zod for this specific field in POSTs
  // For now, assume it's a string as per previous logic.
  return userId;
};

  // POST /settlements - Create a new settlement
  router.post('/', validateRequest(CreateSettlementSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId: string = getRequestingUserId(req);
      const { groupId, payerId, payeeId, amount, currency } = req.body as CreateSettlementDto;

      const settlementData: CreateSettlementData = { groupId, payerId, payeeId, amount, currency, settlementDate: new Date() };
      const settlement: Settlement = await settlementService.createSettlement(settlementData, requestingUserId);
      res.status(HttpCode.CREATED).json(settlement);
    } catch (error) {
      next(error);
    }
  });

  // GET /settlements/:id - Get a settlement by ID
  router.get('/:id', validateParams(GetByIdParamsSchema), validateQuery(RequestingUserQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as GetByIdParamsDto;
      const { requestingUserId } = req.query as unknown as RequestingUserQueryDto;

      if (!id) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: 'Settlement ID is required.',
        });
      }

      const settlement = await settlementService.getSettlementById(id, requestingUserId);
      if (!settlement) {
        throw new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `Settlement with ID ${id} not found or not accessible by user.`,
        });
      }
      res.status(HttpCode.OK).json(settlement);
    } catch (error) {
      next(error);
    }
  });

  // GET /settlements/group/:groupId - Get all settlements for a group
  router.get('/group/:groupId', validateParams(GetByGroupIdParamsSchema), validateQuery(GetByGroupIdQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params as unknown as GetByGroupIdParamsDto;
      const { requestingUserId } = req.query as unknown as GetByGroupIdQueryDto;
      
      if (!groupId) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: 'Group ID is required.',
        });
      }

      const settlements = await settlementService.getSettlementsByGroupId(groupId, requestingUserId);
      res.status(HttpCode.OK).json(settlements);
    } catch (error) {
      next(error);
    }
  });

  // GET /settlements/user/:userId/group/:groupId - Get settlements for a specific user within a group
  router.get('/user/:userId/group/:groupId', validateParams(GetByUserInGroupParamsSchema), validateQuery(GetByUserInGroupQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, groupId } = req.params as unknown as GetByUserInGroupParamsDto;
      const { requestingUserId } = req.query as unknown as GetByUserInGroupQueryDto;

      if (!userId || !groupId) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: 'User ID and Group ID are required.',
        });
      }
      
      const settlements = await settlementService.getSettlementsForUserInGroup(userId, groupId, requestingUserId);
      res.status(HttpCode.OK).json(settlements);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
