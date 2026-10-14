/**
 * ESLint Configuration for Convergence (Mauro Quality Gate Compliant)
 */
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'assets/**', '.wrangler/**'],
  },
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
];
