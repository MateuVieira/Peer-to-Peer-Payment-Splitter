import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ExpenseService } from '../application/expense.service.js';
import { validateRequest, validateParams } from '../../../core/middleware/validation.middleware.js';
import {
  CreateExpenseSchema,
  type CreateExpenseDto,
  GetExpenseByIdParamsSchema,
  type GetExpenseByIdParamsDto,
  GetExpensesByGroupIdParamsSchema,
  type GetExpensesByGroupIdParamsDto,
} from '../application/expense.schemas.js';
import { HttpCode } from '../../../core/error/app.error.js';

export const createExpenseRouter = (expenseService: ExpenseService): Router => {
  const router = Router();

  // POST /expenses - Create a new expense
  router.post('/', validateRequest(CreateExpenseSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createExpenseDto = req.body as CreateExpenseDto;

      const expense = await expenseService.createExpense(createExpenseDto);
      
      res.status(HttpCode.CREATED).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // GET /expenses/:id - Get an expense by ID
  router.get('/:id', validateParams(GetExpenseByIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as GetExpenseByIdParamsDto;

      const expense = await expenseService.getExpenseById(id);
      
      res.status(HttpCode.OK).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // GET /expenses/group/:groupId - Get all expenses for a group
  router.get('/group/:groupId', validateParams(GetExpensesByGroupIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { groupId } = req.params as unknown as GetExpensesByGroupIdParamsDto;

      const expenses = await expenseService.getExpensesByGroupId(groupId);
      
      res.status(HttpCode.OK).json(expenses);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
