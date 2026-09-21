import { BASELINE } from '#shared/baseline'
import { defineCachedFunction } from 'nitro/cache'
import { faceUrls } from './css'
import { useUnifont } from './unifont'

/** A finely subset family can resolve to hundreds of files, so the probes go out in batches. */
const BATCH = 12

/** A CDN that accepts the connection and never answers would otherwise hold the whole batch. */
const PROBE_TIMEOUT = 5_000

/**
 * Total transferred bytes for a set of files, and how many of them reported a length.
 *
 * @param options.download Read the body when a file reports no `content-length`, as Google's
 * glyph-subset URLs do not. Off by default: the catalogue measures thousands of files at a time.
 */
export async function measureFaces(urls: string[], options?: { download?: boolean }) {
  const sizes = await probeSizes(urls, options)
  const known = sizes.filter((size): size is number => size !== undefined)
  return { bytes: known.reduce((total, size) => total + size, 0), measured: known.length }
}

async function probeSizes(urls: string[], { download = false } = {}) {
  const sizes: (number | undefined)[] = []
  for (let index = 0; index < urls.length; index += BATCH) {
    const batch = await Promise.all(urls.slice(index, index + BATCH).map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(PROBE_TIMEOUT) })
        // An error page carries a `content-length` of its own, which is not a font file's size.
        if (!response.ok) {
          return undefined
        }
        const length = Number(response.headers.get('content-length'))
        if (Number.isFinite(length) && length > 0) {
          return length
        }
        if (!download) {
          return undefined
        }
        const body = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT) }).then(res => res.arrayBuffer())
        return body.byteLength || undefined
      }
      catch {
        return undefined
      }
    }))
    sizes.push(...batch)
  }
  return sizes
}

export interface BaselineTransfer {
  bytes: number
  files: number
  /** How many files reported a `content-length`. */
  measured: number
}

/** Cached for a week: this changes only when a provider reissues the files. */
export const baselineTransfer = defineCachedFunction(async (family: string): Promise<BaselineTransfer | null> => {
  const unifont = await useUnifont()
  try {
    const resolved = await unifont.resolveFont(family, {
      weights: [...BASELINE.weights],
      styles: [...BASELINE.styles],
      subsets: [...BASELINE.subsets],
      formats: [...BASELINE.formats],
    })
    if (!resolved.fonts.length) {
      return null
    }
    const urls = faceUrls(resolved.fonts)
    const { bytes, measured } = await measureFaces(urls)
    return measured ? { bytes, files: urls.length, measured } : null
  }
  catch {
    return null
  }
}, { name: 'baseline-transfer', maxAge: 60 * 60 * 24 * 7, getKey: family => family.toLowerCase() })
