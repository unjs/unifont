import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('shared', import.meta.url)),
    },
  },
})
