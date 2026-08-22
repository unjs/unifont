import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      unifont: fileURLToPath(
        new URL('./src/index.ts', import.meta.url).href,
      ),
    },
  },
  test: {
    testTimeout: 10_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unifont',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'proxy',
          root: './proxy',
          include: ['test/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      include: ['src', 'proxy/lib', 'proxy/routes'],
      reporter: ['text', 'json', 'html'],
    },
  },
})
