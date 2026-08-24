import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  testDir: './test/a11y',
  // The Nuxt fixture builds and serves the site once per worker, so a second worker costs a
  // second production build.
  workers: 1,
  // The pages under test read a live catalogue, so an upstream hiccup should not be red.
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      // A production build: the dev-only devtools dock and error overlay inject violations of
      // their own.
      build: true,
      server: true,
    },
  },
  // Both schemes, because the palette is defined twice. The narrow project is 400% zoom of a
  // 1280×1024 window, the viewport WCAG 1.4.10 is written for.
  projects: [
    {
      name: 'light',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
      testIgnore: /reflow\.spec\.ts/,
    },
    {
      // Only the axe sweep: contrast is all that differs between the schemes.
      name: 'dark',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
      testMatch: /axe\.spec\.ts/,
    },
    {
      name: 'narrow',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 256 } },
      testMatch: /reflow\.spec\.ts/,
    },
  ],
})
