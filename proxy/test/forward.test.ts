import type { Endpoint } from '../lib/endpoints'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCachedProxy, finalizeResponse } from '../lib/forward'

const endpoint: Endpoint = {
  route: '/test/v1/thing',
  name: 'test-thing',
  maxAge: 60,
  staleMaxAge: 600,
  allowQuery: ['family'],
  resolve: input => ({
    url: `https://upstream.test/thing?family=${input.query.get('family') ?? ''}`,
    headers: { 'user-agent': 'test' },
  }),
}

function mockUpstream(body: string | (() => Response)) {
  const fetchMock = vi.fn(() => Promise.resolve(typeof body === 'string'
    ? new Response(body, { headers: { 'content-type': 'text/css' } })
    : body()))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function get(url: string, headers?: Record<string, string>) {
  const parsed = new URL(url, 'https://proxy.test')
  return { req: new Request(parsed, { headers }), url: parsed, params: {} }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cached proxy', () => {
  it('serves the second request from the cache', async () => {
    const fetchMock = mockUpstream('a{}')
    const proxy = createCachedProxy({ ...endpoint, name: 'cache-hit' })

    const first = await proxy(get('/test/v1/thing?family=Mock'))
    const second = await proxy(get('/test/v1/thing?family=Mock'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://upstream.test/thing?family=Mock', expect.objectContaining({
      headers: { 'accept': '*/*', 'user-agent': 'test' },
    }))
    expect(first.headers.get('x-cache')).toBe('MISS')
    expect(second.headers.get('x-cache')).toBe('HIT')
    expect(await second.text()).toBe('a{}')
    expect(second.headers.get('cache-control')).toBe('max-age=60, s-maxage=60, stale-while-revalidate=600')
    expect(second.headers.get('etag')).toBeTruthy()
  })

  it('keys the cache on declared query parameters only', async () => {
    const fetchMock = mockUpstream('a{}')
    const proxy = createCachedProxy({ ...endpoint, name: 'cache-key' })

    await proxy(get('/test/v1/thing?family=Mock'))
    await proxy(get('/test/v1/thing?family=Mock&utm_source=x'))
    await proxy(get('/test/v1/thing?family=Other'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('answers a conditional request with 304', async () => {
    mockUpstream('a{}')
    const proxy = createCachedProxy({ ...endpoint, name: 'conditional' })

    const first = await proxy(get('/test/v1/thing?family=Mock'))
    const second = await proxy(get('/test/v1/thing?family=Mock', {
      'if-none-match': first.headers.get('etag')!,
    }))

    expect(second.status).toBe(304)
  })

  it('does not cache an upstream failure', async () => {
    const fetchMock = mockUpstream(() => new Response('nope', { status: 500 }))
    const proxy = createCachedProxy({ ...endpoint, name: 'upstream-error' })

    await expect(proxy(get('/test/v1/thing?family=Mock'))).rejects.toThrow()
    await expect(proxy(get('/test/v1/thing?family=Mock'))).rejects.toThrow()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('passes an upstream 404 through instead of reporting a gateway error', async () => {
    mockUpstream(() => new Response('nope', { status: 404 }))
    const proxy = createCachedProxy({ ...endpoint, name: 'upstream-missing' })

    await expect(proxy(get('/test/v1/thing?family=Mock'))).rejects.toMatchObject({ status: 404 })
  })
})

describe('finalizeResponse', () => {
  const body = 'body{}'.repeat(1000)

  it('serves the upstream body unaltered, leaving compression to the host', async () => {
    mockUpstream(body)
    const proxy = createCachedProxy({ ...endpoint, name: 'identity' })

    const response = finalizeResponse(await proxy(get('/test/v1/thing?family=Mock')))

    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('content-type')).toBe('text/css')
    expect(await response.text()).toBe(body)
  })

  it('marks the response as shared-cacheable and preserves 304s', async () => {
    mockUpstream('a{}')
    const proxy = createCachedProxy({ ...endpoint, name: 'public-cache-control' })

    const first = finalizeResponse(await proxy(get('/test/v1/thing?family=Mock')))
    expect(first.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60, stale-while-revalidate=600')

    const conditional = finalizeResponse(
      await proxy(get('/test/v1/thing?family=Mock', { 'if-none-match': first.headers.get('etag')! })),
    )
    expect(conditional.status).toBe(304)
    expect(conditional.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60, stale-while-revalidate=600')
  })
})
