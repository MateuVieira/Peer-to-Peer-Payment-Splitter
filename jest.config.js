export default {
  preset: "ts-jest/presets/default",
  testEnvironment: "node",
  moduleNameMapper: {
    // Handles .js extensions in imports for ESM project
    // May still be needed if CJS tests import ESM source with .js extensions
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Handle Prisma generated files specifically
    "^(.*)/generated/prisma/index\\.js$": "$1/generated/prisma/index",
  },
  // Make sure Jest can find the Prisma generated files
  moduleDirectories: ["node_modules", "<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json", // Point to the test-specific tsconfig
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.(t|j)s?(x)", "**/?(*.)+(spec|test).(t|j)s?(x)"], // Standard test file patterns
  modulePathIgnorePatterns: ["<rootDir>/dist/"], // Ignore the build output directory
  watchPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
};
