/**
 * Maps an entity that has createdAt and updatedAt fields from Prisma types (string or Date)
 * to a domain entity where these fields are Date objects.
 * @param entity The Prisma entity (e.g., User, Group) or null/undefined.
 * @returns The mapped entity with Date objects for createdAt/updatedAt, or undefined.
 */
export function mapAuditableEntity<T extends { createdAt: Date | string; updatedAt: Date | string } | null | undefined>(
  entity: T,
): (Omit<NonNullable<T>, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }) | undefined {
  if (!entity) {
    return undefined;
  }
  // Destructure to separate createdAt/updatedAt from other properties
  const { createdAt, updatedAt, ...rest } = entity;
  return {
    ...rest, // 'rest' is now correctly typed as Omit<NonNullable<T>, 'createdAt' | 'updatedAt'>
    createdAt: new Date(createdAt), // Explicitly Date
    updatedAt: new Date(updatedAt), // Explicitly Date
  };
}
