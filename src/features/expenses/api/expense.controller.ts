import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ExpenseService } from '../application/expense.service.js';
import { validateRequest, validateParams, validateQuery } from '../../../core/middleware/validation.middleware.js';
import {
  CreateExpenseSchema,
  type CreateExpenseDto,
  GetExpenseByIdParamsSchema,
  type GetExpenseByIdParamsDto,
  GetExpensesByGroupIdParamsSchema,
  type GetExpensesByGroupIdParamsDto,
  ExpenseRequestingUserQuerySchema,
  type ExpenseRequestingUserQueryDto,
} from '../application/expense.schemas.js';
import { HttpCode } from '../../../core/error/app.error.js';

export const createExpenseRouter = (expenseService: ExpenseService): Router => {
  const router = Router();

  // POST /expenses - Create a new expense
  router.post('/', validateRequest(CreateExpenseSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createExpenseDto = req.body as CreateExpenseDto;

      const expense = await expenseService.createExpense(createExpenseDto, createExpenseDto.requestingUserId);
      
      res.status(HttpCode.CREATED).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // GET /expenses/:id - Get an expense by ID
  router.get('/:id', validateParams(GetExpenseByIdParamsSchema), validateQuery(ExpenseRequestingUserQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as GetExpenseByIdParamsDto;
      const { requestingUserId } = req.query as unknown as ExpenseRequestingUserQueryDto;

      const expense = await expenseService.getExpenseById(id, requestingUserId);
      
      res.status(HttpCode.OK).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // GET /expenses/group/:groupId - Get all expenses for a group
  router.get('/group/:groupId', validateParams(GetExpensesByGroupIdParamsSchema), validateQuery(ExpenseRequestingUserQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params as unknown as GetExpensesByGroupIdParamsDto;
      const { requestingUserId } = req.query as unknown as ExpenseRequestingUserQueryDto;

      const expenses = await expenseService.getExpensesByGroupId(groupId, requestingUserId);
      
      res.status(HttpCode.OK).json(expenses);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
