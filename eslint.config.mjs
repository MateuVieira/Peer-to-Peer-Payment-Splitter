import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    // Global ignores
    ignores: ["dist/", "node_modules/"],
  },
  {
    // JavaScript files (if any, e.g., config files)
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    extends: [tseslint.configs.eslintRecommended],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // TypeScript files
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked, // Or recommended for less strictness
      ...tseslint.configs.stylisticTypeChecked, // Or stylistic
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Add any specific rule overrides here
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // e.g., '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Prettier config will be added here later
  eslintConfigPrettier // Add this last to override other formatting rules
);

