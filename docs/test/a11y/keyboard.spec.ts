import { expect, test } from '@nuxt/test-utils/playwright'
import { catalogueFamily, settle } from './utils'

test.describe('command palette', () => {
  test('should track the highlighted row with aria-activedescendant', async ({ page }) => {
    await settle(page, '/')
    await page.click('.pill')

    const input = page.locator('#palette-input')
    await expect(input).toHaveAttribute('role', 'combobox')

    // A single letter, because moving the highlight needs a list with more than one row in it.
    await input.fill('a')
    const options = page.locator('[role="option"]')
    await expect(options.first()).toBeVisible()
    expect(await options.count()).toBeGreaterThan(1)
    await expect(input).toHaveAttribute('aria-expanded', 'true')

    const first = options.first()
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await expect(input).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!)

    await page.keyboard.press('ArrowDown')
    const second = options.nth(1)
    await expect(second).toHaveAttribute('aria-selected', 'true')
    await expect(input).toHaveAttribute('aria-activedescendant', (await second.getAttribute('id'))!)

    // The pattern only works if focus never leaves the input.
    await expect(input).toBeFocused()
  })

  test('should announce how many results arrived', async ({ page }) => {
    await settle(page, '/')
    await page.click('.pill')
    await page.fill('#palette-input', 'a')
    await expect(page.locator('.palette [role="status"]')).toHaveText(/\d+ results?/)
  })

  test('should open the highlighted row on Enter', async ({ page }) => {
    const family = await catalogueFamily(page.request)
    await settle(page, '/')
    await page.click('.pill')
    await page.fill('#palette-input', family)
    await expect(page.locator('[role="option"]').first()).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/fonts/${encodeURIComponent(family)}$`, 'i'))
  })
})

test.describe('output format tabs', () => {
  /*
   * `role="tablist"` promises a single tab stop and arrow-key selection. Without both, a keyboard
   * reader tabs through five controls that a screen reader has told them are one.
   */
  test('should expose one tab stop and move selection with the arrow keys', async ({ page }) => {
    await settle(page, '/fonts/:family')

    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(5)
    const tabIndexes = await tabs.evaluateAll(items => items.map(item => (item as HTMLElement).tabIndex))
    expect(tabIndexes.filter(index => index === 0)).toHaveLength(1)
    expect(tabIndexes.filter(index => index === -1)).toHaveLength(tabIndexes.length - 1)

    await page.locator('#tab-css').click()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('#tab-unifont')).toBeFocused()
    await expect(page.locator('#tab-unifont')).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('End')
    await expect(tabs.last()).toBeFocused()

    await page.keyboard.press('Home')
    await expect(tabs.first()).toBeFocused()
  })
})

test('the current page is announced in the docs rail', async ({ page }) => {
  await settle(page, '/docs/providers')
  await expect(page.locator('.rail__link[aria-current="page"]')).toHaveText('Providers')
})

/*
 * 2.4.1 Bypass Blocks is about where focus ends up, not where the URL points: a link that updates
 * the fragment but leaves focus in the header skips nothing.
 */
test('the skip link moves focus to the main landmark', async ({ page }) => {
  await settle(page, '/')
  await page.keyboard.press('Tab')
  const skip = page.locator('.skip')
  await expect(skip).toBeFocused()

  await skip.press('Enter')
  await expect(page).toHaveURL(/#main$/)
  await expect(page.locator('#main')).toBeFocused()
})
