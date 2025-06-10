export default {
  preset: "ts-jest/presets/default",
  testEnvironment: "node",
  moduleNameMapper: {
    // Handles .js extensions in imports for ESM project
    "^(\.{1,2}/.*)\.js$": "$1",
    // Handle Prisma generated files specifically with more robust patterns
    "^(.*)/generated/prisma/index\.js$": "$1/generated/prisma/index",
    "^(.*)/src/generated/prisma/index\.js$": "$1/src/generated/prisma/index",
    "^.*/generated/prisma/index\.js$": "<rootDir>/src/generated/prisma/index",
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
  clearMocks: true,
  restoreMocks: true,
  automock: false,
};
