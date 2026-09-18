import type { NuxtApp } from '#app'

type FamilyResponse = Awaited<ReturnType<typeof fetchFamily>>

function fetchFamily(family: string, provider?: string) {
  return $fetch(`/api/v1/fonts/${encodeURIComponent(family)}`, {
    query: provider ? { provider } : undefined,
  })
}

export type FamilySummary = Omit<FamilyResponse, 'fonts'> & { faces: number }

/** Keyed on the family, so narrowing a facet refetches against the same entry. An explicit provider gets its own entry. */
export function familyDataKey(family: string, provider?: string) {
  const scope = provider ? `?provider=${encodeURIComponent(provider)}` : ''
  return `font-${encodeURIComponent(family)}${scope}`
}

/** The face list is the largest thing the endpoint returns, and the page only counts it. */
export function toFamilySummary({ fonts, ...rest }: FamilyResponse): FamilySummary {
  return { ...rest, faces: fonts.length }
}

// Not `nuxtApp.static.data`, which a facet toggle would read too and so never refetch.
const prefetched = new Map<string, FamilySummary>()
const asked = new Set<string>()

/** Fetches a family ahead of navigation, so opening it from a grid costs no request. */
export function prefetchFamilyData(family: string, provider?: string) {
  const key = familyDataKey(family, provider)
  if (import.meta.server || asked.has(key)) {
    return
  }
  // Claimed before the request settles, so tracking the pointer across a card asks once.
  asked.add(key)

  // Only a success is recorded, so a failure leaves the page free to ask and report it itself.
  fetchFamily(family, provider)
    .then((response) => {
      prefetched.set(key, toFamilySummary(response))
    })
    .catch(() => {
      asked.delete(key)
    })
}

/**
 * The answer a hover readied. Offered only on a first load: every refetch behind it is a narrowed
 * facet, which has to reach the provider.
 */
export function cachedFamilyData(key: string, nuxtApp: NuxtApp, cause: string) {
  if (cause !== 'initial') {
    return undefined
  }
  return nuxtApp.isHydrating ? nuxtApp.payload.data[key] as FamilySummary | undefined : prefetched.get(key)
}
