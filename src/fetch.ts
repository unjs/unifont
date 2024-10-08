interface Mini$FetchOptions extends RequestInit {
  baseURL?: string
  responseType?: 'json' | 'text'
  query?: Record<string, any>
}

function mini$fetch<T = unknown>(url: string, options?: Mini$FetchOptions) {
  if (options?.baseURL) {
    url = options.baseURL + url
  }
  if (options?.query) {
    const params = new URLSearchParams(options.query)
    url = `${url}?${params.toString()}`
  }
  return fetch(url, options)
    .then(r => options?.responseType === 'json' ? r.json() : r.text()) as Promise<T>
}

export const $fetch = Object.assign(mini$fetch, {
  create: (defaults?: Mini$FetchOptions) => <T = unknown> (url: string, options?: Mini$FetchOptions) => mini$fetch<T>(url, {
    ...defaults,
    ...options,
  }),
})
