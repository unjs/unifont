import { expect, test } from '@nuxt/test-utils/playwright'
import { ROUTES, settle } from './utils'

/*
 * WCAG 1.4.10 Reflow: content has to survive 400% zoom of a 1280×1024 window, which is a 320×256
 * CSS pixel viewport, without a second scroll axis and without losing content. Every page here has
 * at least one thing that wants to be wider (a specimen grid, an eight-column comparison table, a
 * code block), so it is worth asserting rather than assuming.
 */
for (const path of ROUTES) {
  test(`${path} reflows without a second scroll axis`, async ({ page }) => {
    await settle(page, path)

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth, `${path} overflows by ${scrollWidth - clientWidth}px`).toBeLessThanOrEqual(clientWidth + 1)
  })

  /*
   * Reflow also fails when content is clipped rather than scrolled, which the document-level check
   * cannot see. Anything reaching past the viewport is only acceptable inside a scroll container.
   */
  test(`${path} keeps content reachable at 320px`, async ({ page }) => {
    await settle(page, path)

    const clipped = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth + 1
      const scrollable = (element: Element) => {
        const { overflowX } = getComputedStyle(element)
        return (overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth
      }

      return [...document.body.querySelectorAll('*')]
        .filter((element) => {
          const box = element.getBoundingClientRect()
          if (box.width === 0 || box.height === 0 || box.right <= limit) {
            return false
          }
          for (let node: Element | null = element; node; node = node.parentElement) {
            if (scrollable(node)) {
              return false
            }
          }
          return true
        })
        .map((element) => {
          const name = element.className.toString().split(' ').filter(Boolean)[0]
          const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
          return `${element.tagName.toLowerCase()}${name ? `.${name}` : ''} reaches ${Math.round(element.getBoundingClientRect().right)}px (“${text}”)`
        })
    })

    expect([...new Set(clipped)].join('\n')).toBe('')
  })
}
