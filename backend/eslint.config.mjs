import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
    },
    rules: {
      // Import ordering for better code organization
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Unused variables should start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Allow explicit any when needed (warning only)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Require consistent return types (disabled for now)
      '@typescript-eslint/explicit-function-return-type': 'off',

      // Allow console.log for server-side logging
      'no-console': 'off',

      // Allow require() in CommonJS files
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
