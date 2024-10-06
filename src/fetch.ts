import defu from 'defu'
import { fetch } from 'node-fetch-native/proxy'
import { joinURL, withQuery } from 'ufo'

interface Mini$FetchOptions extends RequestInit {
  baseURL?: string
  responseType?: 'json' | 'text'
  query?: Record<string, any>
}

function mini$fetch<T = unknown>(url: string, options?: Mini$FetchOptions) {
  if (options?.baseURL) {
    url = joinURL(options.baseURL, url)
  }
  if (options?.query) {
    url = withQuery(url, options.query)
  }
  return fetch(url, options)
    .then(r => options?.responseType === 'json' ? r.json() : r.text()) as Promise<T>
}

export const $fetch = Object.assign(mini$fetch, {
  create: (defaults?: Mini$FetchOptions) => <T = unknown> (url: string, options?: Mini$FetchOptions) => mini$fetch<T>(url, defu(options, defaults)),
})
