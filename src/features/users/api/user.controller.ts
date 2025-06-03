import { Request, Response, NextFunction, Router } from 'express';
import { UserService, CreateUserDto, CreateUserSchema } from '../application/index.js';
import { AppError, HttpCode } from '../../../core/error/index.js';
import { validateRequest } from '../../../core/index.js';

export function createUserRouter(userService: UserService): Router {
  const userRouter: Router = Router();

// POST /users - Create a new user
userRouter.post('/', validateRequest(CreateUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createUserData = req.body as CreateUserDto;
    const newUser = await userService.createUser(createUserData);
    res.status(HttpCode.CREATED).json(newUser);
  } catch (error) {
    next(error);
  }
});

// GET /users/:id - Get user by ID
userRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'User ID is required.' });
    }
    const user = await userService.getUserById(id);
    res.status(HttpCode.OK).json(user);
  } catch (error) {
    next(error);
  }
});

// GET /users/email/:email - Get user by email
userRouter.get('/email/:email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.params;
    if (!email) {
      throw new AppError({ httpCode: HttpCode.BAD_REQUEST, description: 'User email is required.' });
    }
    const user = await userService.getUserByEmail(email);
    res.status(HttpCode.OK).json(user);
  } catch (error) {
    next(error);
  }
});

  return userRouter;
}
