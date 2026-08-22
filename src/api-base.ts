import type { ProviderContext } from './types'
import { hasWindow, provider } from 'std-env'
import { fetchWithRetries } from './fetch'
import { formatFromUserAgent } from './providers/google'

/** The `unifont`-hosted proxy, used where the provider APIs cannot be reached directly. */
const DEFAULT_API_BASE = 'https://proxy.unifont.dev'

/**
 * Upstream API URL prefixes and the proxy route serving each, applied in order. A URL that matches
 * nothing is requested directly, so providers that already work cross-origin (`npm`, font CDNs)
 * are unaffected.
 * @see https://github.com/unjs/unifont/tree/main/proxy
 */
const proxyRoutes: [pattern: RegExp, route: string][] = [
  [/^https:\/\/typekit\.com\/api\/v1\/json\/kits\/([^/]+)\/published$/, '/adobe/v1/kit/$1'],
  [/^https:\/\/use\.typekit\.net\/([^/]+)\.css$/, '/adobe/v1/kit-css/$1'],
  [/^https:\/\/fonts\.bunny\.net\//, '/bunny/v1/'],
  [/^https:\/\/api\.fontshare\.com\/v2\//, '/fontshare/v1/'],
  [/^https:\/\/api\.fontsource\.org\/v1\//, '/fontsource/v1/'],
  [/^https:\/\/fonts\.google\.com\/metadata\/fonts/, '/google/v1/fonts'],
  [/^https:\/\/fonts\.google\.com\/metadata\/icons/, '/google/v1/icons'],
  [/^https:\/\/fonts\.googleapis\.com\/css2/, '/google/v1/css'],
  [/^https:\/\/fonts\.googleapis\.com\/icon/, '/google/v1/icon'],
]

/**
 * Trims trailing slashes with a loop rather than `/\/+$/`, which backtracks quadratically over a
 * long run of slashes.
 * @see https://github.com/unjs/unifont/security/code-scanning/17
 */
function withoutTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') {
    end--
  }
  return value.slice(0, end)
}

/** Rewrites an upstream API URL to its proxy equivalent, or returns `undefined` if it has none. */
export function toProxyURL(apiBase: string, url: string): string | undefined {
  for (const [pattern, route] of proxyRoutes) {
    if (pattern.test(url)) {
      // Only `route` is used as a replacement, so `$&` and friends in `apiBase` stay literal.
      return withoutTrailingSlashes(apiBase) + url.replace(pattern, route)
    }
  }
}

/**
 * Whether the current environment is subject to CORS, which every provider API except `npm`
 * rejects. Covers browsers and WebContainers, whose Node process is served by the browser and so
 * is bound by the same restrictions.
 */
function requiresProxy(): boolean {
  return hasWindow || provider === 'stackblitz'
}

/** Resolves the configured `apiBase`, falling back to the hosted proxy where one is needed. */
export function resolveAPIBase(apiBase: string | false | undefined): string | undefined {
  if (apiBase === false) {
    return undefined
  }
  return apiBase || (requiresProxy() ? DEFAULT_API_BASE : undefined)
}

/**
 * Wraps the provider fetcher so that requests to a known upstream API are sent to a `unifont`
 * proxy instead.
 *
 * A browser cannot set `user-agent`, which is how Google's endpoints pick a font format, so the
 * requested format moves into the query string for the proxy to apply on our behalf.
 */
export function createAPIFetch(configuredAPIBase: string | false | undefined): ProviderContext['fetch'] {
  const apiBase = resolveAPIBase(configuredAPIBase)
  if (!apiBase) {
    return fetchWithRetries
  }

  return (url, init) => {
    let proxied = toProxyURL(apiBase, url)
    if (!proxied) {
      return fetchWithRetries(url, init)
    }

    const headers = new Headers(init?.headers)
    const format = formatFromUserAgent(headers.get('user-agent'))
    if (format) {
      headers.delete('user-agent')
      proxied += `${proxied.includes('?') ? '&' : '?'}format=${format}`
    }

    return fetchWithRetries(proxied, { ...init, headers })
  }
}
