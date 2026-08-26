import type { ProviderContext } from './types'

/**
 * Requests a provider API, retrying transient failures and routing the request through the
 * `apiBase` proxy if one is configured.
 *
 * This is not part of the public provider context: custom providers request their own endpoints
 * directly, as those are never proxied anyway.
 */
export type APIFetch = (url: string, init?: RequestInit) => Promise<Response>

/** Key of the fetcher `unifont` attaches to the context it hands to the built-in providers. */
export const API_FETCH: unique symbol = Symbol('unifont:fetch')

export interface InternalProviderContext extends ProviderContext {
  [API_FETCH]: APIFetch
}

/** Requests a provider API through the fetcher `unifont` attached to the provider context. */
export function fetchAPI(ctx: ProviderContext, url: string, init?: RequestInit): Promise<Response> {
  return (ctx as InternalProviderContext)[API_FETCH](url, init)
}
