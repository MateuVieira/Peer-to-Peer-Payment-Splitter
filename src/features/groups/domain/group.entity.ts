import { User } from '../../users/domain/user.entity.js';

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: User[];
  createdAt: Date;
  updatedAt: Date;
}
