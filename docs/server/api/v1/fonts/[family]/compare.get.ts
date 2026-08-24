import { createError, getRouterParam } from 'nitro/h3'
import { defineCachedHandler } from 'nitro/cache'
import { faceUrls } from '../../../../utils/css'
import { PROVIDER_META, QUERYABLE_PROVIDERS, useProvider } from '../../../../utils/unifont'
import { normaliseWeights } from '../../../../utils/weights'

/** Total transferred bytes for a set of files, via HEAD so nothing is downloaded. */
async function measure(urls: string[]) {
  // A finely split family runs to well over a hundred files, and CDNs start dropping requests
  // long before that many are in flight at once.
  const CONCURRENCY = 8
  const sizes: (number | undefined)[] = []

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = await Promise.all(urls.slice(i, i + CONCURRENCY).map(async (url) => {
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

  const known = sizes.filter((size): size is number => size !== undefined)
  return { bytes: known.reduce((total, size) => total + size, 0), measured: known.length }
}

/** The same family, asked of every provider that can answer without credentials. */
export default defineCachedHandler(async (event) => {
  const family = decodeURIComponent(getRouterParam(event, 'family') || '')
  if (!family) {
    throw createError({ statusCode: 400, statusMessage: 'A font family is required.' })
  }

  const candidates = QUERYABLE_PROVIDERS.filter(name => name !== 'adobe' && name !== 'npm')

  const results = await Promise.all(candidates.map(async (name) => {
    try {
      const unifont = await useProvider(name)
      const properties = await unifont.getFontProperties(family)
      if (!properties) {
        return { provider: name, label: PROVIDER_META[name].label, available: false as const }
      }
      const resolved = await unifont.resolveFont(family, {
        weights: normaliseWeights(properties.weights?.length ? properties.weights : ['400']).weights,
        styles: properties.styles?.length ? properties.styles : ['normal'],
        subsets: properties.subsets?.length ? properties.subsets : ['latin'],
        formats: ['woff2'],
      })
      const urls = faceUrls(resolved.fonts)
      const transfer = await measure(urls)

      return {
        provider: name,
        label: PROVIDER_META[name].label,
        available: true as const,
        origin: PROVIDER_META[name].origin,
        weights: properties.weights ?? null,
        styles: properties.styles ?? null,
        subsets: properties.subsets ?? null,
        formats: properties.formats ?? null,
        faces: resolved.fonts.length,
        files: urls.length,
        /** Total transferred bytes for the full resolution, so providers are comparable. */
        bytes: transfer.bytes,
        measured: transfer.measured,
        host: urls[0] ? new URL(urls[0]).host : null,
        sample: urls[0] ?? null,
        fallbacks: resolved.fallbacks ?? [],
      }
    }
    catch (cause) {
      return {
        provider: name,
        label: PROVIDER_META[name].label,
        available: false as const,
        error: cause instanceof Error ? cause.message : 'Provider request failed.',
      }
    }
  }))

  return { family, results }
}, {
  // Measuring one family across every provider is well over a hundred HEAD requests.
  maxAge: 60 * 60 * 24,
  name: 'compare',
  getKey: event => decodeURIComponent(getRouterParam(event, 'family') || ''),
})
