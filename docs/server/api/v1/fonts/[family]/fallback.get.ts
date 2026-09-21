import { fallbackFamily, metricFallbackCss } from '#server/utils/css'
import { useProviderScope } from '#server/utils/unifont'
import { defineCachedHandler } from 'nitro/cache'
import { getQuery, getRouterParam, HTTPError } from 'nitro/h3'

export interface FallbackResponse {
  family: string
  /** The family name the generated face is declared under. */
  name: string
  /** The generic the adjustment is built against. */
  generic: string
  fallbacks: string[]
  /** Empty when no metrics could be read from the served file. */
  css: string
  overrides: {
    sizeAdjust: string | null
    ascentOverride: string | null
    descentOverride: string | null
    lineGapOverride: string | null
  } | null
}

/** Read back so a page can show the numbers as well as apply them. */
function overridesFrom(css: string) {
  const read = (property: string) => css.match(new RegExp(`${property}:\\s*([^;]+);`))?.[1]?.trim() ?? null
  return {
    sizeAdjust: read('size-adjust'),
    ascentOverride: read('ascent-override'),
    descentOverride: read('descent-override'),
    lineGapOverride: read('line-gap-override'),
  }
}

/** A metric-matched fallback for one family: the `@font-face` to paste, and what it overrides. */
export default defineCachedHandler(async (event): Promise<FallbackResponse> => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const { unifont, allowed } = await useProviderScope(getQuery(event).provider)

  const resolved = await unifont.resolveFont(family, {
    weights: ['400'],
    styles: ['normal'],
    subsets: ['latin'],
    formats: ['woff2'],
  }, allowed)

  if (!resolved.fonts.length) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No provider could resolve \`${family}\`.` })
  }

  const fallbacks = resolved.fallbacks?.length ? resolved.fallbacks : ['sans-serif']
  const css = await metricFallbackCss(family, resolved.fonts, fallbacks)

  event.res.headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800')

  return {
    family,
    name: fallbackFamily(family),
    generic: fallbacks[0]!,
    fallbacks,
    css,
    overrides: css ? overridesFrom(css) : null,
  }
}, {
  maxAge: 60 * 60 * 24 * 7,
  name: 'fallback',
  allowQuery: ['provider'],
  getKey: event => `${getRouterParam(event, 'family')}:${String(getQuery(event).provider ?? '')}`,
})
