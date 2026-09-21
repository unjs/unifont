import { getQuery } from 'nuxt/server'
import { getRouterParam } from 'nitro/h3'
import { defineCachedHandler } from 'nitro/cache'
import { faceUrls } from '#server/utils/css'
import { measureFaces } from '#server/utils/transfer'
import { useProviderScope } from '#server/utils/unifont'
import { normaliseWeights } from '#server/utils/weights'
import { familyParam } from '#server/utils/family'

export interface TransferResponse {
  family: string
  faces: number
  files: number
  /** How many files reported a `content-length`. */
  measured: number
  bytes: number
}

function list(value: unknown, fallback: string[]) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

/**
 * Transfer size for a selection, measured with HEAD requests so nothing is downloaded. Cached
 * hard: the UI asks on every toggle, and the answer changes only when the provider reissues.
 */
export default defineCachedHandler(async (event): Promise<TransferResponse> => {
  const family = await familyParam(event)

  const query = getQuery(event)
  const { unifont, allowed } = await useProviderScope(query.provider)

  const resolved = await unifont.resolveFont(family, {
    weights: normaliseWeights(list(query.weights, ['400'])).weights,
    styles: list(query.styles, ['normal']) as ('normal' | 'italic' | 'oblique')[],
    subsets: list(query.subsets, ['latin']),
    formats: ['woff2'],
  }, allowed)

  const urls = faceUrls(resolved.fonts)

  const { bytes, measured } = await measureFaces(urls)

  return {
    family,
    faces: resolved.fonts.length,
    files: urls.length,
    measured,
    bytes,
  }
}, {
  maxAge: 60 * 60 * 24,
  name: 'transfer',
  // Undeclared parameters are stripped, so a stray one cannot multiply cache entries.
  allowQuery: ['provider', 'weights', 'styles', 'subsets'],
  getKey: (event) => {
    const query = getQuery(event)
    const facets = ['provider', 'weights', 'styles', 'subsets']
      .map(name => `${name}=${list(query[name], []).join('+')}`)
      .join('&')
    return `${decodeURIComponent(getRouterParam(event, 'family') || '').toLowerCase()}:${facets}`
  },
})
