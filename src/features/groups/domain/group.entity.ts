import { User } from '../../users/domain/user.entity.js';

export interface Group {
  id: string; // Consider using UUIDs
  name: string;
  description?: string; // Optional description
  members: User[]; // Now an array of User objects
  createdAt: Date;
  updatedAt: Date;
}
