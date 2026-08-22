import type { Endpoint, EndpointInput } from '../lib/endpoints'
import { addRoute, createRouter, findRoute } from 'rou3'
import { describe, expect, it } from 'vitest'
import { endpoints, userAgents } from '../lib/endpoints'

/** The only hosts any endpoint is ever allowed to resolve to. */
const upstreamOrigins = [
  'https://typekit.com',
  'https://use.typekit.net',
  'https://fonts.bunny.net',
  'https://api.fontshare.com',
  'https://api.fontsource.org',
  'https://fonts.google.com',
  'https://fonts.googleapis.com',
]

const hostileValues = [
  'https://evil.test',
  '//evil.test/x',
  '../../evil',
  '..%2f..%2fevil',
  '\\\\evil.test',
  'user@evil.test',
  'valid?redirect=https://evil.test',
  'valid#@evil.test',
  'valid%00',
  ' https://evil.test',
]

function routeParams(route: string): string[] {
  return route.split('/').filter(segment => segment.startsWith(':')).map(segment => segment.slice(1))
}

const router = createRouter<Endpoint>()
for (const endpoint of endpoints) {
  addRoute(router, '', endpoint.route, endpoint)
}

function request(path: string) {
  const url = new URL(path, 'https://proxy.test')
  const matched = findRoute(router, '', url.pathname)
  if (!matched) {
    throw new Error(`No endpoint matched \`${url.pathname}\`.`)
  }
  return {
    endpoint: matched.data,
    ...matched.data.resolve({ params: matched.params ?? {}, query: url.searchParams }),
  }
}

describe('endpoints', () => {
  it('has a unique cache name per endpoint', () => {
    const names = endpoints.map(endpoint => endpoint.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('cannot be steered at a host it does not already serve', () => {
    for (const endpoint of endpoints) {
      const params = routeParams(endpoint.route)

      for (const value of hostileValues) {
        const inputs: EndpointInput[] = [
          ...params.map(name => ({ params: { [name]: value }, query: new URLSearchParams() })),
          ...(endpoint.allowQuery ?? []).map(key => ({
            params: Object.fromEntries(params.map(name => [name, 'valid'])),
            query: new URLSearchParams([[key, value]]),
          })),
        ]

        for (const input of inputs) {
          let resolved: string
          try {
            resolved = endpoint.resolve(input).url
          }
          catch {
            continue
          }
          expect(upstreamOrigins, `\`${endpoint.name}\` resolved \`${value}\` to \`${resolved}\``)
            .toContain(new URL(resolved).origin)
        }
      }
    }
  })

  it.each([
    ['/adobe/v1/kit/dpm4jkh', 'https://typekit.com/api/v1/json/kits/dpm4jkh/published'],
    ['/adobe/v1/kit-css/dpm4jkh', 'https://use.typekit.net/dpm4jkh.css'],
    ['/bunny/v1/list', 'https://fonts.bunny.net/list'],
    ['/bunny/v1/css?family=abeezee:400', 'https://fonts.bunny.net/css?family=abeezee:400'],
    ['/fontshare/v1/fonts?offset=0&limit=100', 'https://api.fontshare.com/v2/fonts?offset=0&limit=100'],
    ['/fontshare/v1/css?f[]=alpino@300', 'https://api.fontshare.com/v2/css?f[]=alpino@300'],
    ['/fontsource/v1/fonts', 'https://api.fontsource.org/v1/fonts'],
    ['/fontsource/v1/fonts/roboto', 'https://api.fontsource.org/v1/fonts/roboto'],
    ['/fontsource/v1/variable/roboto', 'https://api.fontsource.org/v1/variable/roboto'],
    ['/google/v1/fonts', 'https://fonts.google.com/metadata/fonts'],
    ['/google/v1/icons', 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true'],
    ['/google/v1/icon?family=Material+Icons', 'https://fonts.googleapis.com/icon?family=Material+Icons'],
  ])('resolves %s', (path, expected) => {
    expect(request(path).url).toBe(expected)
  })

  it('resolves google css requests with axes, glyphs and icon names', () => {
    expect(request('/google/v1/css?family=Roboto:ital,wght@0,400;1,700').url)
      .toBe('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;1,700')

    expect(request('/google/v1/css?family=Roboto&text=abc%20%C3%A9').url)
      .toBe('https://fonts.googleapis.com/css2?family=Roboto&text=abc%20%C3%A9')

    expect(request('/google/v1/css?family=Material+Symbols+Outlined&icon_names=home,search').url)
      .toBe('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=home,search')
  })

  it('maps the requested font format to a user agent', () => {
    expect(request('/google/v1/css?family=Roboto').headers).toEqual({ 'user-agent': userAgents.woff2 })
    expect(request('/google/v1/css?family=Roboto&format=woff').headers).toEqual({ 'user-agent': userAgents.woff })
    expect(request('/google/v1/icon?family=Material+Icons&format=ttf').headers).toEqual({ 'user-agent': userAgents.ttf })
  })

  it('ignores query parameters an endpoint does not declare', () => {
    expect(request('/google/v1/css?family=Roboto&utm_source=x&v=123').url)
      .toBe('https://fonts.googleapis.com/css2?family=Roboto')
    expect(request('/bunny/v1/list?cache-buster=1').url).toBe('https://fonts.bunny.net/list')
  })

  it.each([
    '/google/v1/css',
    '/google/v1/css?family=Roboto&format=svg',
    '/google/v1/css?family=../../etc/passwd',
    '/adobe/v1/kit/..%2f..%2fsecret',
    '/adobe/v1/kit/kit-with-dashes',
    '/fontsource/v1/fonts/roboto%2f..',
    '/bunny/v1/css?family=https://evil.test',
    '/fontshare/v1/fonts?limit=100000',
  ])('rejects %s', (path) => {
    expect(() => request(path)).toThrow()
  })
})
