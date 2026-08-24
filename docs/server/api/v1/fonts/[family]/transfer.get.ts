import { createError, getQuery, getRouterParam } from 'nitro/h3'
import { defineCachedHandler } from 'nitro/cache'
import { faceUrls } from '../../../../utils/css'
import { useProviderScope } from '../../../../utils/unifont'
import { normaliseWeights } from '../../../../utils/weights'
import type { TransferResponse } from '#shared/types'

function list(value: unknown, fallback: string[]) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

/** A finely subset family can resolve to hundreds of files, so the probes go out in batches. */
const BATCH = 12

async function probeSizes(urls: string[]) {
  const sizes: (number | undefined)[] = []
  for (let index = 0; index < urls.length; index += BATCH) {
    const batch = await Promise.all(urls.slice(index, index + BATCH).map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        const length = Number(response.headers.get('content-length'))
        return Number.isFinite(length) && length > 0 ? length : undefined
      }
      catch {
        return undefined
      }
    }))
    sizes.push(...batch)
  }
  return sizes
}

/**
 * Transfer size for a selection, measured with HEAD requests so nothing is downloaded. Cached
 * hard: the UI asks on every toggle, and the answer changes only when the provider reissues.
 */
export default defineCachedHandler(async (event): Promise<TransferResponse> => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw createError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const query = getQuery(event)
  const { unifont, allowed } = await useProviderScope(query.provider)

  const resolved = await unifont.resolveFont(family, {
    weights: normaliseWeights(list(query.weights, ['400'])).weights,
    styles: list(query.styles, ['normal']) as ('normal' | 'italic' | 'oblique')[],
    subsets: list(query.subsets, ['latin']),
    formats: ['woff2'],
  }, allowed)

  const urls = faceUrls(resolved.fonts)

  const sizes = await probeSizes(urls)

  const known = sizes.filter((size): size is number => size !== undefined)

  return {
    family,
    faces: resolved.fonts.length,
    files: urls.length,
    /** How many files reported a `content-length`. */
    measured: known.length,
    bytes: known.reduce((total, size) => total + size, 0),
  }
}, {
  maxAge: 60 * 60 * 24,
  name: 'transfer',
  // Only the parameters the handler reads, so an unrelated query string cannot multiply entries.
  getKey: (event) => {
    const query = getQuery(event)
    const facets = ['provider', 'weights', 'styles', 'subsets']
      .map(name => `${name}=${list(query[name], []).join('+')}`)
      .join('&')
    return `${getRouterParam(event, 'family')}:${facets}`
  },
})
