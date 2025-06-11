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
  // let url = _url
  // if (options?.baseURL) {
  //   url = options.baseURL + url
  // }
  // if (options?.query) {
  //   const params = new URLSearchParams(options.query)
  //   url = `${url}?${params.toString()}`
  // }

  const retries = options?.retries ?? 3
  const retryDelay = options?.retryDelay ?? 1000

  // console.error(url)

  // return fetch(url, options)
  //   .then(r => options?.responseType === 'json' ? r.json() : r.text())
  //   .catch((err) => {
  //     if (retries <= 0) {
  //       throw err
  //     }
  //     console.warn(`Could not fetch from \`${url}\`. Will retry in \`${retryDelay}ms\`. \`${retries}\` retries left.`)
  //     return new Promise(resolve => setTimeout(resolve, retryDelay))
  //       .then(() => mini$fetch(_url, { ...options, retries: retries - 1 }))
  //   }) as Promise<T>

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
