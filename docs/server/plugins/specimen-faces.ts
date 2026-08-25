import { definePlugin } from 'nitro'
import { specimenSheet } from '#server/utils/specimens'

/**
 * Inlines a page's specimen faces into its head, so nothing has to be fetched and parsed before
 * the browser can discover the font files behind them. Written here rather than through
 * `useHead`, which would serialise the same kilobytes into the hydration payload as well.
 */
const SHEETS = {
  '/': { grid: 'featured', href: '/api/v1/specimens.css' },
  '/fonts': { grid: 'catalogue', href: '/api/v1/catalogue.css' },
} as const

export default definePlugin((nitro) => {
  nitro.hooks.hook('render:html', async (html, { event }) => {
    const { pathname, search } = event.url
    const sheet = SHEETS[pathname as keyof typeof SHEETS]
    // A query is a search or a page of results, which the fixed sheet does not hold.
    if (!sheet || search) {
      return
    }
    const css = await specimenSheet(sheet.grid).catch(() => '')
    if (css) {
      html.head.push(`<style data-specimen-faces="${sheet.href}">${css}</style>`)
    }
  })
})
