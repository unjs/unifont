import { afterEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../lib/endpoints'
import proxyRoute from '../routes/[...path]'
import indexRoute from '../routes/index'

function call(path: string, init?: RequestInit) {
  const url = new URL(path, 'https://proxy.test')
  return (proxyRoute as any)({ req: new Request(url, init), url })
}

function mockUpstream(body = 'upstream') {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(body, { headers: { 'content-type': 'text/plain' } })))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('proxy route', () => {
  it('forwards a known endpoint to its upstream', async () => {
    const fetchMock = mockUpstream('bunny list')

    const response = await call('/bunny/v1/list')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('bunny list')
    expect(fetchMock).toHaveBeenCalledWith('https://fonts.bunny.net/list', expect.anything())
    expect(response.headers.get('cache-control')).toContain('public')
  })

  it('answers a CORS preflight so the browser proceeds to the real request', async () => {
    const fetchMock = mockUpstream()

    const response = await call('/bunny/v1/list', {
      method: 'OPTIONS',
      headers: { 'origin': 'https://example.com', 'access-control-request-method': 'GET' },
    })

    expect(response.status).toBe(204)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])('rejects %s, naming the methods it does allow', async (method) => {
    const fetchMock = mockUpstream()

    const error = await call('/bunny/v1/list', { method }).catch((error: any) => error)

    expect(error.status).toBe(405)
    expect(error.headers.get('allow')).toBe('GET, HEAD')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('serves HEAD, which a cache may use to revalidate', async () => {
    mockUpstream()

    const response = await call('/bunny/v1/list', { method: 'HEAD' })

    expect(response.status).toBe(200)
  })

  it('returns 404 for a path no endpoint claims', async () => {
    const fetchMock = mockUpstream()

    await expect(call('/not/an/endpoint')).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a known endpoint given an invalid parameter', async () => {
    const fetchMock = mockUpstream()

    await expect(call('/adobe/v1/kit/not_a_valid_id')).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('index route', () => {
  it('lists every endpoint it serves', () => {
    const body = (indexRoute as any)() as {
      status: string
      endpoints: { route: string, query: string[], maxAge: number }[]
    }

    expect(body.status).toBe('experimental')
    expect(body.endpoints.map(endpoint => endpoint.route)).toEqual(endpoints.map(endpoint => endpoint.route))
    expect(body.endpoints.every(endpoint => endpoint.maxAge > 0)).toBe(true)
  })
})
