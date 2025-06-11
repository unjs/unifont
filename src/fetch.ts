import { ofetch } from 'ofetch'
import * as fetchLib from './fetch'

interface Mini$FetchOptions extends RequestInit {
  baseURL?: string
  responseType?: 'json' | 'text'
  query?: Record<string, any>
  retries?: number
  retryDelay?: number
}

export function mini$fetch<T = unknown>(url: string, options?: Mini$FetchOptions): Promise<T> {
  const retries = options?.retries ?? 3
  const retryDelay = options?.retryDelay ?? 1000

  return ofetch(url, {
    baseURL: options?.baseURL,
    query: options?.query,
    responseType: options?.responseType ?? 'text',
    headers: options?.headers,
  }).catch((err) => {
    if (retries <= 0) {
      throw err
    }
    console.warn(`Could not fetch from \`${(options?.baseURL ?? '') + url}\`. Will retry in \`${retryDelay}ms\`. \`${retries}\` retries left.`)
    return new Promise(resolve => setTimeout(resolve, retryDelay))
      .then(() => fetchLib.mini$fetch(url, { ...options, retries: retries - 1 }))
  }) as Promise<T>
}

export const $fetch = Object.assign(mini$fetch, {
  create: (defaults?: Mini$FetchOptions) => <T = unknown> (url: string, options?: Mini$FetchOptions) => mini$fetch<T>(url, {
    ...defaults,
    ...options,
  }),
})
