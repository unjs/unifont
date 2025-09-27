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
    coverage: {
      include: ['src'],
      reporter: ['text', 'json', 'html'],
    },
  },
})
