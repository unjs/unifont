import type { Endpoint, UpstreamRequest } from './endpoints'
import { HTTPError } from 'nitro'
import { createMemoryStorage, defineCachedHandler } from 'ocache'
import { InvalidRequestError } from './endpoints'

/** Upstream responses larger than this are passed through without being cached. */
const MAX_BODY_SIZE = 8 * 1024 * 1024

/** Seconds to wait for an upstream response before giving up. */
const UPSTREAM_TIMEOUT = 20

const storage = createMemoryStorage({ maxBytes: 64 * 1024 * 1024, maxSize: 1000 })

export interface ProxyEvent {
  req: Request
  url: URL
  params: Record<string, string>
}

export type CachedProxy = (event: ProxyEvent) => Promise<Response>

async function forward(event: ProxyEvent, endpoint: Endpoint): Promise<Response> {
  let request: UpstreamRequest
  try {
    request = endpoint.resolve({ params: event.params, query: event.url.searchParams })
  }
  catch (error) {
    if (error instanceof InvalidRequestError) {
      throw new HTTPError({ status: 400, message: error.message })
    }
    throw error
  }

  const { url, headers } = request

  const response = await fetch(url, {
    headers: { accept: '*/*', ...headers },
    signal: event.req.signal,
  })

  if (!response.ok) {
    throw new HTTPError({
      status: response.status === 400 || response.status === 404 ? response.status : 502,
      message: `Upstream responded with \`${response.status}\`.`,
    })
  }

  // Only the content type is carried over; nothing else the upstream sends is ours to replay.
  return new Response(await response.arrayBuffer(), {
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/octet-stream' },
  })
}

/** Marks the response as cacheable by the shared cache in front of us. */
export function finalizeResponse(response: Response): Response {
  const cacheControl = response.headers.get('cache-control')
  if (!cacheControl || cacheControl.includes('public')) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set('cache-control', `public, ${cacheControl}`)
  return new Response(response.body, { status: response.status, headers })
}

export function createCachedProxy(endpoint: Endpoint): CachedProxy {
  return defineCachedHandler<ProxyEvent>(event => forward(event, endpoint), {
    name: endpoint.name,
    maxAge: endpoint.maxAge,
    staleMaxAge: endpoint.staleMaxAge,
    swr: true,
    allowQuery: endpoint.allowQuery ?? [],
    maxBodySize: MAX_BODY_SIZE,
    maxResolveTime: UPSTREAM_TIMEOUT,
    storage,
  })
}
