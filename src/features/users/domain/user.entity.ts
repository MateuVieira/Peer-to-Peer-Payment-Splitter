export interface User {
  id: string; // Consider using UUIDs
  name: string;
  email: string; // Should be unique
  createdAt: Date;
  updatedAt: Date;
}
