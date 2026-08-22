import { addRoute, createRouter, findRoute } from 'rou3'
import { describe, expect, it } from 'vitest'
import { endpoints, userAgents } from '../proxy/lib/endpoints'
import { toProxyURL } from '../src/api-base'
import { userAgents as providerUserAgents } from '../src/providers/google'

const API_BASE = 'https://proxy.test'

const router = createRouter<typeof endpoints[number]>()
for (const endpoint of endpoints) {
  addRoute(router, '', endpoint.route, endpoint)
}

/** Sends a rewritten URL through the proxy's own routing and validation. */
function throughProxy(upstream: string, format?: keyof typeof userAgents) {
  const proxied = toProxyURL(API_BASE, upstream)
  if (!proxied) {
    throw new Error(`\`${upstream}\` was not rewritten.`)
  }

  const url = new URL(proxied)
  if (format) {
    url.searchParams.set('format', format)
  }

  const matched = findRoute(router, '', url.pathname)
  if (!matched) {
    throw new Error(`\`${url.pathname}\` matched no proxy endpoint.`)
  }

  return matched.data.resolve({ params: matched.params ?? {}, query: url.searchParams })
}

describe('proxy round trip', () => {
  it.each([
    'https://typekit.com/api/v1/json/kits/abc123/published',
    'https://use.typekit.net/abc123.css',
    'https://fonts.bunny.net/list',
    'https://fonts.bunny.net/css?family=poppins:400',
    'https://api.fontshare.com/v2/fonts?offset=0&limit=100',
    'https://api.fontshare.com/v2/css?f[]=satoshi@400',
    'https://api.fontsource.org/v1/fonts',
    'https://api.fontsource.org/v1/fonts/poppins',
    'https://api.fontsource.org/v1/variable/poppins',
    'https://fonts.google.com/metadata/fonts',
    'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;1,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
  ])('resolves %s back to the same upstream URL', (upstream) => {
    expect(throughProxy(upstream).url).toBe(upstream)
  })

  it('resolves the icon metadata endpoint, which carries fixed query parameters', () => {
    expect(throughProxy('https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true').url)
      .toBe('https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true')
  })

  it.each(Object.keys(providerUserAgents) as (keyof typeof userAgents)[])('restores the %s user agent', (format) => {
    const upstream = 'https://fonts.googleapis.com/css2?family=Poppins'
    expect(throughProxy(upstream, format).headers).toEqual({ 'user-agent': providerUserAgents[format] })
    expect(userAgents[format]).toBe(providerUserAgents[format])
  })

  it('trims trailing slashes', () => {
    expect(toProxyURL(`${API_BASE}///`, 'https://fonts.bunny.net/list'))
      .toBe(`${API_BASE}/bunny/v1/list`)
  })

  it('does not backtrack over a long run of interior slashes', { timeout: 5000 }, () => {
    const slashes = '/'.repeat(200_000)
    expect(toProxyURL(`${API_BASE}${slashes}x`, 'https://fonts.bunny.net/list'))
      .toBe(`${API_BASE}${slashes}x/bunny/v1/list`)
  })

  it('treats `$` sequences in apiBase literally', () => {
    expect(toProxyURL('https://proxy.test/$&', 'https://fonts.bunny.net/list'))
      .toBe('https://proxy.test/$&/bunny/v1/list')
  })

  it('leaves URLs without a proxy route alone', () => {
    expect(toProxyURL(API_BASE, 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5/400.css')).toBeUndefined()
    expect(toProxyURL(API_BASE, 'https://fonts.gstatic.com/s/poppins/v24/font.woff2')).toBeUndefined()
  })
})
