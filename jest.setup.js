// Mock the Prisma client to avoid module resolution issues in tests
jest.mock('./src/generated/prisma/index.js', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      // Add mock implementations for any Prisma methods used in tests
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      // Add other Prisma client methods as needed
    })),
  };
}, { virtual: true });

// Mock other modules as needed
