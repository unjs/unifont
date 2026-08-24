import { createError, defineEventHandler, getQuery, getRouterParam, setResponseHeader } from 'nitro/h3'
import { metricFallbackCss, toFontFaceCss } from '../../../../utils/css'
import { useProviderScope } from '../../../../utils/unifont'
import { normaliseWeights } from '../../../../utils/weights'

function list(value: unknown, fallback: string[]) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

/**
 * The ends of the published range plus a text weight and a bold, so a preview has something to
 * move between without downloading the whole family.
 */
function representativeWeights(published: string[]) {
  const numeric = published.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (numeric.length <= 4) {
    return published
  }
  const nearest = (target: number) => numeric.reduce(
    (best, weight) => (Math.abs(weight - target) < Math.abs(best - target) ? weight : best),
    numeric[0]!,
  )
  return [...new Set([numeric[0]!, nearest(400), nearest(700), numeric.at(-1)!])].map(String)
}

function nearestWeight(published: string[], target: number) {
  const numeric = published.map(Number).filter(Number.isFinite)
  if (!numeric.length) {
    return published[0] ?? '400'
  }
  return String(numeric.reduce((best, weight) => (Math.abs(weight - target) < Math.abs(best - target) ? weight : best), numeric[0]!))
}

/** Servable `@font-face` CSS for a family, meant to be read and copied as much as linked. */
export default defineEventHandler(async (event) => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw createError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const query = getQuery(event)
  const { unifont, allowed } = await useProviderScope(query.provider)

  /*
   * `preset=preview` is what the family page renders its specimens with: every script and style
   * the provider publishes, and a weight set broad enough to drive the tester. It takes no other
   * parameters, so the URL is stable for a family and can be warmed on hover.
   */
  let weights: string[]
  let styles: ('normal' | 'italic' | 'oblique')[]
  let subsets: string[]

  if (query.preset === 'preview' || query.preset === 'warm') {
    const properties = await unifont.getFontProperties(family, allowed)
    const published = properties?.weights ?? ['400']
    const range = published.find(weight => weight.includes(' '))
    /*
     * `preset=warm` is the specimen face and nothing else. Warmed stylesheets stay in the
     * document, and the preview preset runs to hundreds of `@font-face` rules for a family like
     * Noto Sans, which is enough to make the whole document slow to restyle.
     */
    if (query.preset === 'warm') {
      weights = range ? [range] : [nearestWeight(published, 400)]
      styles = ['normal']
      subsets = properties?.subsets?.includes('latin') ? ['latin'] : [properties?.subsets?.[0] ?? 'latin']
    }
    else {
      weights = range ? [range] : representativeWeights(published)
      styles = (properties?.styles?.length ? properties.styles : ['normal']) as typeof styles
      subsets = properties?.subsets?.length ? properties.subsets : ['latin']
    }
  }
  else {
    weights = normaliseWeights(list(query.weights, ['400'])).weights
    styles = list(query.styles, ['normal']) as ('normal' | 'italic' | 'oblique')[]
    subsets = list(query.subsets, ['latin'])
  }

  const resolved = await unifont.resolveFont(family, { weights, styles, subsets, formats: ['woff2'] }, allowed)

  // `as` renames the declared family, so several providers can serve it at once without their
  // declarations colliding.
  const alias = typeof query.as === 'string' && query.as.trim() ? query.as.trim() : family

  setResponseHeader(event, 'content-type', 'text/css; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')

  // An empty result is an answer, not a failure: a 404 would break the page that linked the
  // stylesheet, so say so in a comment and stay a valid CSS document.
  if (!resolved.fonts.length) {
    return `/* ${family}: nothing matched this request.\n`
      + ` * weights: ${weights.join(', ') || 'none'} | styles: ${styles.join(', ') || 'none'} | subsets: ${subsets.join(', ') || 'none'}\n`
      + ' * The provider does not publish that combination.\n */\n'
  }

  const header = [
    `/* ${family}: resolved by unifont from the \`${resolved.provider}\` provider.`,
    ` * https://unifont.dev/fonts/${encodeURIComponent(family)}`,
    ' */',
  ].join('\n')

  const fallbackCss = await metricFallbackCss(alias, resolved.fonts, resolved.fallbacks ?? [])

  return [
    header,
    '',
    toFontFaceCss(alias, resolved.fonts, { fallbacks: resolved.fallbacks, withMetricFallback: !!fallbackCss }),
    fallbackCss ? `\n/* Metric-matched fallback, so text does not reflow when the real font lands. */\n${fallbackCss}` : '',
  ].join('\n')
})
