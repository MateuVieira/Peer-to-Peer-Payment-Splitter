import { Router, type Request, type Response, type NextFunction } from 'express';
import type { SettlementService } from '../application/settlement.service.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';
import type { CreateSettlementData } from '../domain/settlement.repository.js';
import { validateRequest, validateParams } from '../../../core/middleware/validation.middleware.js';
import {
  CreateSettlementSchema,
  type CreateSettlementDto,
  GetByIdParamsSchema,
  type GetByIdParamsDto,
  GetByGroupIdParamsSchema,
  type GetByGroupIdParamsDto,
  GetByUserInGroupParamsSchema,
  type GetByUserInGroupParamsDto,
} from '../application/settlement.schemas.js';
import type { Settlement } from '../domain/settlement.entity.js';

export const createSettlementRouter = (settlementService: SettlementService): Router => {
  const router = Router();

  // POST /settlements - Create a new settlement
  router.post('/', validateRequest(CreateSettlementSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId, payerId, payeeId, amount, currency } = req.body as CreateSettlementDto;

      const settlementData: CreateSettlementData = { groupId, payerId, payeeId, amount, currency, settlementDate: new Date() };
      const settlement: Settlement = await settlementService.createSettlement(settlementData);
      res.status(HttpCode.CREATED).json(settlement);
    } catch (error) {
      next(error);
    }
  });

  // GET /settlements/:id - Get a settlement by ID
  router.get('/:id', validateParams(GetByIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as GetByIdParamsDto;

      if (!id) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: 'Settlement ID is required.',
        });
      }

      const settlement = await settlementService.getSettlementById(id);
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
  router.get('/group/:groupId', validateParams(GetByGroupIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params as unknown as GetByGroupIdParamsDto;
      
      if (!groupId) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: 'Group ID is required.',
        });
      }

      const settlements = await settlementService.getSettlementsByGroupId(groupId);
      res.status(HttpCode.OK).json(settlements);
    } catch (error) {
      next(error);
    }
  });

  // GET /settlements/user/:userId/group/:groupId - Get settlements for a specific user within a group
  router.get('/user/:userId/group/:groupId', validateParams(GetByUserInGroupParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, groupId } = req.params as unknown as GetByUserInGroupParamsDto;

      if (!userId || !groupId) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: 'User ID and Group ID are required.',
        });
      }
      
      const settlements = await settlementService.getSettlementsForUserInGroup(userId, groupId);
      res.status(HttpCode.OK).json(settlements);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
