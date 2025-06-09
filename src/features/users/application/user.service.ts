import { IUserRepository } from "../domain/user.repository.js";
import { User } from "../domain/user.entity.js";
import { AppError, HttpCode } from "../../../core/error/app.error.js";
import { logger } from "../../../core/logger.js";

export interface UpdateUserDto {
  name?: string;
}

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
        description: "User with this email already exists.",
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
        description: "User not found.",
      });
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found.",
      });
    }
    return user;
  }

  async updateUser(userId: string, updateData: UpdateUserDto): Promise<User> {
    const userToUpdate = await this.userRepository.findById(userId);
    if (!userToUpdate) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found.",
      });
    }

    const finalUpdateData: Partial<UpdateUserDto> = {};
    let hasChanges = false;
    if (
      Object.prototype.hasOwnProperty.call(updateData, "name") &&
      updateData.name !== userToUpdate.name
    ) {
      finalUpdateData.name = updateData.name;
      hasChanges = true;
    }

    if (!hasChanges) {
      return userToUpdate;
    }

    const updatedUser = await this.userRepository.update(userId, finalUpdateData);
    if (!updatedUser) {
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: "Failed to update user.",
      });
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    const userToDelete = await this.userRepository.findById(userId);
    if (!userToDelete) {
      throw new AppError({
        httpCode: HttpCode.NOT_FOUND,
        description: "User not found. Cannot delete.",
      });
    }

    try {
      await this.userRepository.delete(userId);
    } catch (error) {
      const errorMessage = "Failed to delete user due to an unexpected error.";
      if (error instanceof Error) {
        logger.error(
          { originalError: error, userId },
          "Detailed error during user deletion in service"
        );
      }
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: errorMessage,
      });
    }
  }
}
