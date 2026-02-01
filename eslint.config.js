import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

/**
 * ESLint Configuration (Flat Config Format)
 * * Using ESLint 9.x flat config format for better performance and clarity
 * * Enforces React best practices and hooks rules
 */
export default [
  // Ignore build output
  {
    ignores: ['dist', 'dev-dist', 'node_modules']
  },
  
  // Main configuration for JS/JSX files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': [
        'error', 
        { 
          varsIgnorePattern: '^(_|[A-Z_])',
          argsIgnorePattern: '^_',
        }
      ],
    },
  },
]
