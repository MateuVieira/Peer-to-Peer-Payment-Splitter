import { IUserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.entity.js';
import { AppError, HttpCode } from '../../../core/error/app.error.js';

export interface CreateUserDto {
  name: string;
  email: string;
}

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError({
        httpCode: HttpCode.CONFLICT,
        description: 'User with this email already exists.',
      });
    }

    const newUser = await this.userRepository.create(userData);
    return newUser;
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: 'User not found.',
      });
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: 'User not found.',
      });
    }
    return user;
  }
}
