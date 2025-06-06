import { User } from '../../users/domain/user.entity.js';

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  members: User[];
  createdAt: Date;
  updatedAt: Date;
}
