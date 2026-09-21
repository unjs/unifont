import { specimenAlias } from '#shared/featured'

/** The `&provider=` suffix for a font CSS URL, empty when the cascade is left to pick. */
export function providerScope(provider?: string) {
  return provider ? `&provider=${encodeURIComponent(provider)}` : ''
}

/** The warmed sheet's URL, so the family page can link and await the very tag warming used. */
export function warmStylesheetUrl(family: string, provider?: string) {
  return `/api/v1/fonts/${encodeURIComponent(family)}/css?preset=warm&as=${encodeURIComponent(specimenAlias(family))}${providerScope(provider)}`
}

/**
 * Loads a family's specimen face ahead of navigation, on hover or keyboard focus: Nuxt prefetches
 * the route's payload, and this does the same for the typeface. The family page then loads the
 * full preview stylesheet and calls `drop`.
 */
export function useFontWarmup() {
  // Warmed sheets stay in the document, and every live `@font-face` rule is work the browser
  // redoes when the font set changes. One weight and one subset each keeps the limit this high.
  const LIMIT = 24

  const links = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[data-warm-family]')]

  const currentFamily = () => {
    const match = /^\/fonts\/([^/]+)/.exec(window.location.pathname)
    return match ? decodeURIComponent(match[1]!) : undefined
  }

  /*
   * A grid declares the same faces itself, but its sheet goes with the page: only the warmed link
   * survives the navigation to paint the specimen while the family page's own is in flight. Both
   * resolve the same file, so the second declaration costs nothing to fetch, and it is declared
   * under the specimen alias so that adding it does not restyle a grid card set in the family.
   */
  function warm(family: string, provider?: string) {
    if (import.meta.server) {
      return
    }
    const scope = provider ?? ''
    const existing = links()
    if (existing.some(link => link.dataset.warmFamily === family && link.dataset.warmProvider === scope)) {
      return
    }
    // Document order is insertion order, so the front of the list is the least recently warmed.
    // The family on screen is never evicted, which would drop its specimen to the fallback.
    const onScreen = currentFamily()
    const evictable = existing.filter(link => link.dataset.warmFamily !== onScreen)
    for (const stale of evictable.slice(0, Math.max(existing.length - LIMIT + 1, 0))) {
      stale.remove()
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.dataset.warmFamily = family
    link.dataset.warmProvider = scope
    link.href = warmStylesheetUrl(family, provider)
    document.head.append(link)
  }

  /** Releases a warmed stylesheet. Safe to call for a family that was never warmed. */
  function drop(family: string) {
    if (import.meta.server) {
      return
    }
    for (const link of links()) {
      if (link.dataset.warmFamily === family) {
        link.remove()
      }
    }
  }

  return { warm, drop }
}
