export default {
  preset: "ts-jest/presets/default",
  testEnvironment: "node",
  moduleNameMapper: {
    // Support for path aliases from tsconfig.json with special handling for index.js files
    "^@/(.*)$": "<rootDir>/src/$1",
    "^(@prisma|@core/lib/prisma\.js)$": "<rootDir>/src/generated/prisma/index",
    "^@core/index\.js$": "<rootDir>/src/core/index",
    "^@core/(.+)\.js$": "<rootDir>/src/core/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@features/(.+)\.js$": "<rootDir>/src/features/$1",
    "^@features/(.*)$": "<rootDir>/src/features/$1",
    "^@test/(.+)\.js$": "<rootDir>/tests/$1",
    "^@test/(.*)$": "<rootDir>/tests/$1",
    
    // Legacy paths - still needed during transition to path aliases
    // Map the specific path used in the group repository - this needs to be first for precedence
    "^../../../../generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
    
    // Handle all possible Prisma client imports
    "^(.*/|)generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
    "^(.*/|)src/generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
    
    // Handle any number of relative path levels (more generic pattern)
    "^(\.\./)+generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
    
    // Handle the core database module
    "^(.*/|)core/database/prisma\.client\.js$": "<rootDir>/src/core/database/prisma.client",
    
    // Handle the new centralized Prisma client
    "^(.*/|)core/lib/prisma\.js$": "<rootDir>/src/generated/prisma/index",
    
    // Handles .js extensions in imports for ESM project - this must come after specific mappers
    "^(\.{1,2}/.*)\.js$": "$1",
  },
  // Make sure Jest can find the Prisma generated files
  moduleDirectories: ["node_modules", "<rootDir>/src"],
  transform: {
    "^.+\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json", // Point to the test-specific tsconfig
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.(t|j)s?(x)", "**/?(*.)+(spec|test).(t|j)s?(x)"], // Standard test file patterns
  modulePathIgnorePatterns: ["<rootDir>/dist/"], // Ignore the build output directory
  watchPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  // Explicitly tell Jest to clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  automock: false,
};
