import { expect, test } from '@nuxt/test-utils/playwright'
import { catalogueFamily, ROUTES, settle } from './utils'

/*
 * A client-side navigation replaces the document. Without focus management the reader is left on a
 * link that no longer exists, and nothing is announced: SC 2.4.3, and the SPA routing rule.
 */
test('a route change resets focus to the main landmark', async ({ page }) => {
  await settle(page, '/')
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Docs' }).click()
  await expect(page).toHaveURL(/\/docs$/)
  await expect(page.locator('#main')).toBeFocused()
})

test('the new page title is announced', async ({ page }) => {
  await settle(page, '/')
  const announcer = page.locator('[aria-live]').first()
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'API' }).click()
  await expect(announcer).toContainText('HTTP API')
})

/*
 * A live region has to be in the document before the message lands. Swapping the element that
 * carries `role="status"` in and out with the message means it is announced inconsistently or not
 * at all, so the region is asserted to survive the change rather than accompany it.
 */
test('the catalogue count is one region that outlives its message', async ({ page }) => {
  await settle(page, '/fonts')
  const status = page.locator('.head__count[role="status"]')
  await expect(status).toHaveCount(1)

  const before = await status.elementHandle()
  await page.fill('#catalogue-search', 'qzqzqz')
  await expect(status).toContainText('Nothing matches')

  const after = await status.elementHandle()
  expect(await before!.evaluate((node, other) => node === other, after)).toBe(true)
})

/*
 * Paging onto the last page disables the button that was just pressed. A natively disabled element
 * cannot hold focus, which drops the reader at the top of the document with nothing announced.
 */
test('the catalogue pager refuses without dropping focus', async ({ page }) => {
  await settle(page, '/fonts')
  const previous = page.getByRole('button', { name: /previous/ })
  await expect(previous).toHaveAttribute('aria-disabled', 'true')
  // Playwright reads `aria-disabled` as disabled, so the native property is what distinguishes
  // "refuses the action" from "cannot hold focus".
  expect(await previous.evaluate(node => (node as HTMLButtonElement).disabled)).toBe(false)

  await previous.focus()
  await expect(previous).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(previous).toBeFocused()
})

/*
 * The relationship attributes and the listbox they point at have to appear together. Driving them
 * from the row count while the list itself sat behind the error branch left `aria-controls` and
 * `aria-activedescendant` aimed at ids that were not in the document — which axe cannot see,
 * because from its side the attributes are present.
 */
test('the palette advertises no listbox it has not rendered', async ({ page }) => {
  await page.route('**/api/v1/fonts?*', route => route.abort())
  await page.goto('/')
  await page.click('.pill')

  const input = page.locator('#palette-input')
  // Matches a static destination, so the row list is not empty even though the search failed.
  await input.fill('docs')
  await expect(page.locator('.palette__note--error')).toBeVisible()

  const controls = await input.getAttribute('aria-controls')
  const active = await input.getAttribute('aria-activedescendant')
  const expanded = await input.getAttribute('aria-expanded')

  if (expanded === 'true') {
    await expect(page.locator('#palette-results')).toHaveCount(1)
  }
  for (const id of [controls, active].filter(Boolean)) {
    await expect(page.locator(`#${id}`)).toHaveCount(1)
  }
})

/*
 * `scrollable-region-focusable` is conditional: a container earns a tab stop only while it has
 * something to scroll to. Applied unconditionally it litters the tab order with stops that lead
 * nowhere (A11Y.md §6, Focus Traps Nobody Asked For).
 */
for (const path of ROUTES) {
  test(`${path} has no tab stop on a container that cannot scroll`, async ({ page }) => {
    await settle(page, path)
    const idle = await page.evaluate(() =>
      [...document.querySelectorAll('div[tabindex="0"], pre[tabindex="0"]')]
        .filter(element => element.scrollWidth <= element.clientWidth + 1
          && element.scrollHeight <= element.clientHeight + 1)
        .map(element => `${element.tagName.toLowerCase()}.${element.className.toString().split(' ')[0]}`),
    )
    expect([...new Set(idle)].join('\n')).toBe('')
  })
}

/*
 * SC 2.5.3: the accessible name has to contain the visible label, or voice control has nothing to
 * say. The marker reads as "?" and is named by the question it answers, so the question is text
 * inside it rather than an `aria-label` over it.
 */
test('the help marker keeps its visible glyph inside its name', async ({ page }) => {
  const family = await catalogueFamily(page.request)
  await settle(page, `/fonts/${encodeURIComponent(family)}`)
  await page.locator('#tab-fontless').click()

  const marker = page.locator('.help__marker').first()
  await expect(marker).toHaveAccessibleName(/what is fontless/i)
  await expect(marker).not.toHaveAttribute('aria-label')
})
