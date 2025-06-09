module.exports = {
  ignorePatterns: [
    '.eslintrc.cjs',
    'eslint.config.mjs',
    'jest.config.js',
    '.prettierrc.cjs',
    'dist/**/*',
    'node_modules/**/*',
  ],
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'jest',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended',
    'plugin:jest/style',
  ],
  rules: {
    // Add any project-specific ESLint rules here
    // Example: 
    // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

    // It's often good to allow .js extensions for ESM compatibility in TS files
    // However, your project setup seems to handle this via moduleNameMapper in Jest
    // and TypeScript's moduleResolution, so we might not need this explicitly.
    // 'import/extensions': [
    //   'error',
    //   'ignorePackages',
    //   {
    //     js: 'never',
    //     jsx: 'never',
    //     ts: 'never',
    //     tsx: 'never',
    //   },
    // ],
  },
  overrides: [
    {
      files: ['src/**/*.ts'], // For main source TypeScript files
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        // Add any src-specific TypeScript rules here if needed
        // For example, to enforce stricter rules than in tests:
        // '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    {
      files: [
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/**/*.ts', // Catches files in the tests directory
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'jest'],
      env: {
        jest: true,
        'jest/globals': true,
      },
      parserOptions: {
        project: './tsconfig.spec.json', // Use test-specific tsconfig
      },
      rules: {
        // Disable TypeScript strict rules for Jest mocks and globals
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        'no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        // Allow unbound methods in test expectations (common with Jest mocks)
        '@typescript-eslint/unbound-method': 'off',
      },
    },
  ],
};
