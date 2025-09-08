import type { CacheKeyBuilder } from './types'
import { hash as ohash } from 'ohash'

function sanitize(input?: string) {
  if (!input)
    return ''
  return input.replace(/[^\w.-]/g, '_')
}

function join(...parts: Array<string | null | undefined | boolean | number>) {
  // Sanitize each part and remove empty results, then join with a hyphen.
  return parts
    .map(p => sanitize(String(p)))
    .filter(p => p !== '')
    .join('-')
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
export function createCacheKeyFactory(providerName: string, providerOptions: unknown) {
  const provider = sanitize(providerName)
  const providerHash = ohash(providerOptions)

  return (label: string, build?: CacheKeyBuilder) => {
    const safeLabel = sanitize(label)

    const body = build ? build({ hash: ohash, join }) : ''
    const safeBody = sanitize(body)

    // <provider>:<providerOptionsHash>-<label> (when body empty)
    // <provider>:<providerOptionsHash>-<body>-<label>
    return safeBody
      ? `${provider}:${providerHash}-${safeBody}-${safeLabel}`
      : `${provider}:${providerHash}-${safeLabel}`
  }
}
