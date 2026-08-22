import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../src'

const API_BASE = 'https://proxy.test'

const MOCK_CSS = `@font-face {
  font-family: 'Mock';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/mock/v1/mock.woff2) format('woff2');
}`

function mockFetch(responses: Record<string, unknown>) {
  const requests: string[] = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    requests.push(decodeURIComponent(url))
    const match = Object.entries(responses).find(([path]) => url.startsWith(`${API_BASE}${path}`))
    if (!match) {
      return Promise.resolve(new Response('Not found', { status: 404 }))
    }
    const body = match[1]
    return Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body)))
  }) as typeof globalThis.fetch

  return {
    requests,
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}

let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  restore = undefined
})

describe('apiBase', () => {
  it('routes google requests through the proxy, naming the format', async () => {
    const mock = mockFetch({
      '/google/v1/fonts': { familyMetadataList: [{ family: 'Mock', category: 'Sans Serif', fonts: { 400: {} }, axes: [] }] },
      '/google/v1/css': MOCK_CSS,
    })
    restore = mock.restore

    const unifont = await createUnifont([providers.google()], { apiBase: API_BASE })
    const { fonts } = await unifont.resolveFont('Mock', { weights: ['400'], styles: ['normal'], formats: ['woff2'] })

    expect(fonts.length).toBeGreaterThan(0)
    expect(mock.requests[0]).toBe(`${API_BASE}/google/v1/fonts`)
    expect(mock.requests.at(-1)).toContain(`${API_BASE}/google/v1/css?family=Mock`)
    expect(mock.requests.at(-1)).toContain('format=woff2')
  })

  it('routes googleicons requests through the proxy', async () => {
    const mock = mockFetch({
      '/google/v1/icons': `)]}'\n${JSON.stringify({ families: ['Material Symbols Outlined', 'Material Icons'] })}`,
      '/google/v1/css': MOCK_CSS,
      '/google/v1/icon': MOCK_CSS,
    })
    restore = mock.restore

    const unifont = await createUnifont([providers.googleicons()], { apiBase: API_BASE })

    await unifont.resolveFont('Material Symbols Outlined', { formats: ['woff2'] })
    expect(mock.requests.at(-1)).toContain(`${API_BASE}/google/v1/css?family=Material Symbols Outlined`)
    expect(mock.requests.at(-1)).toContain('format=woff2')

    await unifont.resolveFont('Material Icons', { formats: ['woff'] })
    expect(mock.requests.at(-1)).toBe(`${API_BASE}/google/v1/icon?family=Material Icons&format=woff`)
  })

  it('routes adobe requests through the proxy', async () => {
    const mock = mockFetch({
      '/adobe/v1/kit/abc123': {
        kit: {
          id: 'abc123',
          families: [{ id: 'mock', name: 'Mock', slug: 'mock', css_names: ['mock'], css_stack: '', variations: ['n4'] }],
        },
      },
      '/adobe/v1/kit-css/abc123': MOCK_CSS,
    })
    restore = mock.restore

    const unifont = await createUnifont([providers.adobe({ id: 'abc123' })], { apiBase: API_BASE })
    await unifont.resolveFont('Mock', { weights: ['400'], styles: ['normal'], formats: ['woff2'] })

    expect(mock.requests).toEqual([
      `${API_BASE}/adobe/v1/kit/abc123`,
      `${API_BASE}/adobe/v1/kit-css/abc123`,
    ])
  })

  it.each([
    ['bunny', () => providers.bunny(), { '/bunny/v1/list': { mock: { variants: { latin: 1 }, isVariable: false, styles: ['normal'], weights: [400], familyName: 'Mock', defSubset: 'latin', category: 'sans-serif' } }, '/bunny/v1/css': MOCK_CSS }, [`${API_BASE}/bunny/v1/list`, `${API_BASE}/bunny/v1/css?family=mock:400`]],
    ['fontshare', () => providers.fontshare(), { '/fontshare/v1/fonts': { fonts: [{ name: 'Mock', slug: 'mock', category: 'Sans Serif', styles: [{ weight: { number: 400, weight: 400 }, is_italic: false }] }], has_more: false }, '/fontshare/v1/css': MOCK_CSS }, [`${API_BASE}/fontshare/v1/fonts?offset=0&limit=100`, `${API_BASE}/fontshare/v1/css?f[]=mock@400`]],
    ['fontsource', () => providers.fontsource(), { '/fontsource/v1/fonts': [{ id: 'mock', family: 'Mock', subsets: ['latin'], weights: [400], styles: ['normal'], defSubset: 'latin', variable: false, category: 'sans-serif' }] }, [`${API_BASE}/fontsource/v1/fonts`, `${API_BASE}/fontsource/v1/fonts/mock`]],
  ])('routes %s requests through the proxy', async (_name, provider, responses, expected) => {
    const mock = mockFetch(responses)
    restore = mock.restore

    const unifont = await createUnifont([provider()], { apiBase: API_BASE })
    await unifont.resolveFont('Mock', { weights: ['400'], styles: ['normal'], formats: ['woff2'] })

    for (const url of expected) {
      expect(mock.requests).toContain(url)
    }
  })

  it('ignores a trailing slash on apiBase', async () => {
    const mock = mockFetch({ '/bunny/v1/list': {} })
    restore = mock.restore

    await createUnifont([providers.bunny()], { apiBase: `${API_BASE}/` })

    expect(mock.requests).toEqual([`${API_BASE}/bunny/v1/list`])
  })

  it('requests upstream APIs directly when no apiBase is set', async () => {
    const mock = mockFetch({})
    restore = mock.restore

    await createUnifont([providers.bunny()]).catch(() => {})

    expect(mock.requests).toEqual(['https://fonts.bunny.net/list'])
  })
})
