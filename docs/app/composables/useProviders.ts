import type { ProvidersResponse } from '#shared/types'

/** The provider list, on a shared key so the colophon and the pages that read it fetch once. */
export function useProviders() {
  return useFetch<ProvidersResponse>('/api/v1/providers', { key: 'providers' })
}
