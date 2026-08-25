import { definePlugin } from 'nitro'

/**
 * Preloads the faces the interface is set in. Nothing knows their URLs until the build has run,
 * and `fontless`'s own `preload` option emits through `transformIndexHtml`, which a
 * server-rendered app never runs.
 */
const FAMILIES = ['Newsreader', 'Switzer', 'JetBrains Mono']

/** Upright only: italic is rare enough on a given page to be worth a late request. */
function uprightFontURLs(css: string) {
  // A face can be declared in more than one of the inlined sheets.
  const urls = new Set<string>()
  for (const [, block] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const declared = /font-family:\s*(?:"([^"]*)"|'([^']*)'|([^;}]*))/.exec(block!)
    const family = (declared?.[1] ?? declared?.[2] ?? declared?.[3] ?? '').trim()
    if (!FAMILIES.includes(family) || /font-style:\s*italic/.test(block!)) {
      continue
    }
    const url = /url\(\s*["']?([^"')]+\.woff2)/.exec(block!)?.[1]
    if (url) {
      urls.add(url)
    }
  }
  return [...urls]
}

export default definePlugin((nitro) => {
  // The faces live in the global styles, which are the same on every page.
  let tags: string[] | undefined

  nitro.hooks.hook('render:html', (html) => {
    tags ??= uprightFontURLs(html.head.join('')).map(url =>
      `<link rel="preload" as="font" type="font/woff2" href="${url}" crossorigin>`)
    html.head.push(...tags)
  })
})
