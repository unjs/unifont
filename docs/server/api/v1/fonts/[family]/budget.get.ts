import type { BudgetPlan } from '#server/utils/budget'
import { PREVIEW_MAX, previewText } from '#shared/featured'
import { codepointsFor, facesForCodepoints, planFor } from '#server/utils/budget'
import { useProviderScope } from '#server/utils/unifont'
import { normaliseWeights } from '#server/utils/weights'
import { defineCachedHandler } from 'nitro/cache'
import { getQuery, getRouterParam, HTTPError } from 'nitro/h3'

export interface BudgetResponse {
  family: string
  text: string
  /** The provider that answered, or `null` where the cascade reported none. */
  provider: string | null
  /** Distinct non-whitespace code points in the text. */
  characters: number
  weights: string[]
  styles: string[]
  /** Published, what the text pulls, and where a provider can subset, the glyph list too. */
  plans: BudgetPlan[]
}

function list(value: unknown, fallback: string[]) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

/**
 * What one string costs: everything the selection publishes, only the files the text pulls, and,
 * where a provider subsets to a glyph list, that too. Measured the same way, so they compare.
 */
export default defineCachedHandler(async (event): Promise<BudgetResponse> => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const query = getQuery(event)
  const text = previewText(query.text)
  if (!text) {
    throw new HTTPError({ statusCode: 400, statusMessage: `Pass \`?text=\` with up to ${PREVIEW_MAX} characters to price.` })
  }

  const { unifont, allowed } = await useProviderScope(query.provider)

  const properties = await unifont.getFontProperties(family, allowed)
  if (!properties) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No provider knows \`${family}\`.` })
  }

  const weights = normaliseWeights(list(query.weights, ['400'])).weights
  const styles = list(query.styles, ['normal']) as ('normal' | 'italic' | 'oblique')[]
  const subsets = properties.subsets?.length ? properties.subsets : ['latin']

  const resolved = await unifont.resolveFont(family, { weights, styles, subsets, formats: ['woff2'] }, allowed)
  if (!resolved.fonts.length) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No provider could resolve \`${family}\` for this selection.` })
  }

  const codepoints = codepointsFor(text)
  const needed = facesForCodepoints(resolved.fonts, codepoints)

  const glyphs = [...new Set([...text])].sort()
  const subsetted = await unifont
    .resolveFont(family, {
      weights,
      styles,
      subsets,
      formats: ['woff2'],
      options: { google: { experimental: { glyphs } } },
    }, allowed)
    .catch(() => undefined)

  // Only google subsets to a glyph list; the rest would report a plan identical to the first.
  const subsetPlan = resolved.provider === 'google' && subsetted?.fonts.length
    ? await planFor('subset to your text', subsetted.fonts, { download: true })
    : null

  const [published, fetched] = await Promise.all([
    planFor('everything published', resolved.fonts),
    planFor('what your text pulls', needed),
  ])

  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')

  return {
    family,
    text,
    provider: resolved.provider ?? null,
    characters: codepoints.length,
    weights,
    styles,
    plans: [published, fetched, ...(subsetPlan ? [subsetPlan] : [])],
  }
}, {
  maxAge: 60 * 60 * 24,
  name: 'budget',
  allowQuery: ['provider', 'weights', 'styles', 'text'],
  getKey: (event) => {
    const query = getQuery(event)
    const facets = ['provider', 'weights', 'styles', 'text']
      .map(name => `${name}=${String(query[name] ?? '')}`)
      .join('&')
    return `${getRouterParam(event, 'family')}:${facets}`
  },
})
