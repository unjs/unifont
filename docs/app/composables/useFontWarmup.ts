/**
 * Loads a family's specimen face ahead of navigation, on hover or keyboard focus: Nuxt prefetches
 * the route's payload, and this does the same for the typeface. The family page then loads the
 * full preview stylesheet and calls `drop`.
 */
export function useFontWarmup() {
  const claimed = useState<string[]>('font-claimed', () => [])

  // Warmed sheets stay in the document, and every live `@font-face` rule is work the browser
  // redoes when the font set changes. One weight and one subset each keeps the limit this high.
  const LIMIT = 24

  const links = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[data-warm-family]')]

  const currentFamily = () => {
    const match = /^\/fonts\/([^/]+)/.exec(window.location.pathname)
    return match ? decodeURIComponent(match[1]!) : undefined
  }

  /**
   * Declares families a page loads itself, typically through the batch stylesheet behind a
   * specimen grid. Warming those again would declare a second set of `@font-face` rules and
   * visibly re-resolve the face under the cursor.
   */
  function claim(families: readonly string[]) {
    for (const family of families) {
      if (!claimed.value.includes(family)) {
        claimed.value.push(family)
      }
    }
  }

  function warm(family: string) {
    if (import.meta.server || claimed.value.includes(family)) {
      return
    }
    const existing = links()
    if (existing.some(link => link.dataset.warmFamily === family)) {
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
    link.href = `/api/v1/fonts/${encodeURIComponent(family)}/css?preset=warm`
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

  return { warm, claim, drop }
}
