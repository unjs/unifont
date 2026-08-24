import { expect, test } from '@nuxt/test-utils/playwright'
import { settle } from './utils'

const MINIMUM = 24

const PAGES = ['/', '/fonts', '/fonts/:family', '/compare?family=:family', '/api', '/docs/providers']

/*
 * WCAG 2.2 2.5.8 Target Size (Minimum). Two exceptions are honoured, because without them the
 * check fails on markup that conforms: a link sitting in a run of prose is exempt, and an
 * undersized target passes if 24px circles centred on it and on every neighbour never intersect.
 */
for (const path of PAGES) {
  test(`${path} has no undersized targets`, async ({ page }) => {
    await settle(page, path)
    const undersized = await page.evaluate((minimum) => {
      /**
       * The inline exception: the target flows inside text that is not part of the target, which
       * is decided by looking for the surrounding text itself rather than by the parent's tag.
       */
      const isInline = (element: Element) => {
        if (!getComputedStyle(element).display.startsWith('inline')) {
          return false
        }
        const parent = element.parentElement
        if (!parent) {
          return false
        }
        return [...parent.childNodes].some(node =>
          node !== element && node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        )
      }

      /** Painted, hittable and not disabled: anything else is not a target on this page. */
      const isActionable = (element: Element) => {
        if ((element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true') {
          return false
        }
        const style = getComputedStyle(element)
        return style.visibility === 'visible'
          && style.pointerEvents !== 'none'
          && Number(style.opacity) > 0
      }

      /** The visible name, so a failure points at something findable in the source. */
      const describe = (element: Element) => {
        const name = element.className.toString().split(' ').filter(Boolean)[0]
        const label = (element.textContent ?? '').trim().slice(0, 30)
          || element.getAttribute('aria-label')
          || element.getAttribute('title')
          || ''
        return `${element.tagName.toLowerCase()}${name ? `.${name}` : ''}${label ? ` (“${label}”)` : ''}`
      }

      const targets = [
        ...document.querySelectorAll('button, summary, select, [role="tab"], [role="option"], input[type="checkbox"], input[type="radio"]'),
        ...[...document.querySelectorAll('a[href]')].filter(link => !isInline(link)),
      ]
        .filter(isActionable)
        .map(element => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0)

      const centre = (box: DOMRect) => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 })

      /** The spacing exception: 24px circles do not intersect while their centres are 24px apart. */
      const wellSpaced = (target: typeof targets[number]) => {
        const from = centre(target.box)
        return targets.every((other) => {
          if (other.element === target.element) {
            return true
          }
          const to = centre(other.box)
          return Math.hypot(from.x - to.x, from.y - to.y) >= minimum
        })
      }

      return targets
        .filter(({ box }) => box.width < minimum || box.height < minimum)
        .filter(target => !wellSpaced(target))
        .map(({ element, box }) => `${describe(element)} is ${Math.round(box.width)}×${Math.round(box.height)} and crowded`)
    }, MINIMUM)

    expect([...new Set(undersized)].join('\n')).toBe('')
  })
}
