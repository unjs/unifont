import { expect, test } from '@nuxt/test-utils/playwright'
import { describeViolations, ROUTES, settle, violations } from './utils'

for (const path of ROUTES) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await settle(page, path)
    const results = await violations(page)
    expect(describeViolations(results)).toBe('')
  })
}

/*
 * Scanned as a whole document rather than as a `.palette` subtree: with the dialog open, the
 * failures that matter (focus escaping it, background content left reachable) live outside it.
 */
test('the command palette has no axe violations', async ({ page }) => {
  await settle(page, '/')
  await page.click('.pill')
  await page.fill('#palette-input', 'a')
  await expect(page.locator('[role="option"]').first()).toBeVisible()
  // Contrast is measured on the settled panel: mid-animation the reading is of a transient
  // composite rather than of what the reader sits in front of.
  await page.locator('.palette').evaluate(node =>
    Promise.all(node.getAnimations().map(animation => animation.finished)),
  )

  const results = await violations(page)
  expect(describeViolations(results)).toBe('')
})
