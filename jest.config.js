export default {
  preset: "ts-jest/presets/default",
  testEnvironment: "node",
  moduleNameMapper: {
    // Handle Prisma generated files specifically with more robust patterns
    "^(.*/|)generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
    "^(.*/|)src/generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
    // Handles .js extensions in imports for ESM project - this must come after more specific mappers
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
