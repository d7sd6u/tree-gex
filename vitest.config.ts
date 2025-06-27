import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/'],
    },
    typecheck: {
      include: ['src/**/*.test.ts'],
    },
  },
});
