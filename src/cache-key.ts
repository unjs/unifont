import type { CacheKeyFactory } from './types'
import { hash as ohash } from 'ohash'

function sanitize(input?: string) {
  if (!input)
    return ''
  return input.replace(/[^\w.-]/g, '_')
}

function join(...parts: Array<string | number>) {
  const out: string[] = []
  for (const p of parts) {
    const s = sanitize(String(p))
    if (!s)
      continue
    out.push(s)
  }
  return out.join('-')
}

/**
 * Create a cache-key factory bound to a provider and its options.
 * Format: `<provider>:<hash>-<body?>-<label>` (body omitted if empty).
 * All parts are sanitized to `[\w.-]` and joined with `-`.
 *
 * Example:
 * ```ts
 * const cacheKey = createCacheKeyFactory('google', { experimental: {} })
 * // Meta only
 * const metaKey = cacheKey('meta.json')
 * // Data key (family + resolve options hash)
 * const dataKey = cacheKey('data.json', ({ hash, join }) => join('Roboto', hash({ weights: ['400'], styles: ['normal'], subsets: ['latin'] })))
 * ```
 */
export function createCacheKeyFactory(providerName: string, providerOptions: unknown): CacheKeyFactory {
  const provider = sanitize(providerName)
  const providerHash = ohash(providerOptions)

  return (label, ...rest) => {
    const safeLabel = sanitize(label)

    const body = join(...rest.map(r => typeof r === 'string' ? r : ohash(r)))
    const safeBody = sanitize(body)

    // <provider>:<providerOptionsHash>-<label> (when body empty)
    // <provider>:<providerOptionsHash>-<body>-<label>
    return safeBody
      ? `${provider}:${providerHash}-${safeBody}-${safeLabel}`
      : `${provider}:${providerHash}-${safeLabel}`
  }
}
