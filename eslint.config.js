import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', '.vercel/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['app.js', 'config.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['dev-server.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
];
