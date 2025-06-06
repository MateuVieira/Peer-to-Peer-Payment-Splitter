/**
 * Defines constants for Prisma query error codes.
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference#prisma-client-query-engine-error-codes
 */
export const PrismaErrorCodes = {
  /**
   * An operation failed because it depends on one or more records that were required but not found.
   * E.g., a foreign key constraint failed, or a `.delete()` or `.update()` on a record that does not exist.
   */
  RECORD_NOT_FOUND: 'P2025',
  /**
   * Unique constraint failed on the {constraint}.
   * E.g., trying to create a record with a unique field that already exists.
   */
  UNIQUE_CONSTRAINT_FAILED: 'P2002',
  /**
   * Foreign key constraint failed on the field: {field_name}
   */
  FOREIGN_KEY_CONSTRAINT_FAILED: 'P2003',
  // Add other commonly used Prisma error codes here as needed
} as const;
