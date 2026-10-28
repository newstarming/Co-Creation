import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Computer use's end-to-end tests: real mouse and keyboard on this machine, one file at a time. */
const FRAMEWORK_SRC = fileURLToPath(new URL('../../vendor/cortico/src/', import.meta.url));

export default defineConfig({
  resolve: { alias: [{ find: /^cortico\//, replacement: FRAMEWORK_SRC }] },
  server: { fs: { allow: [fileURLToPath(new URL('./', import.meta.url)), FRAMEWORK_SRC] } },
  test: {
    include: ['tests/cua/e2e/**/*.test.ts'],
    env: { CORTICO_LANGUAGE: 'zh' },
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
  },
});
