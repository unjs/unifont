import type { ProviderName } from './unifont'
import { QUERYABLE_PROVIDERS, useProvider } from './unifont'

export interface CatalogueEntry {
  family: string
  providers: ProviderName[]
}

interface Catalogue {
  entries: CatalogueEntry[]
  byFamily: Map<string, CatalogueEntry>
  builtAt: number
  /** Providers that failed to answer, so the UI can say so rather than under-report. */
  unavailable: ProviderName[]
}

let building: Promise<Catalogue> | undefined

async function build(): Promise<Catalogue> {
  const byFamily = new Map<string, CatalogueEntry>()
  const unavailable: ProviderName[] = []

  const lists = await Promise.all(QUERYABLE_PROVIDERS.map(async (name) => {
    if (name === 'npm' || name === 'adobe') {
      // Neither can enumerate: npm is the whole registry, adobe needs a project id.
      return { name, families: undefined }
    }
    try {
      const unifont = await useProvider(name)
      return { name, families: await unifont.listFonts() }
    }
    catch {
      return { name, families: undefined }
    }
  }))

  for (const { name, families } of lists) {
    if (!families?.length) {
      if (name !== 'npm' && name !== 'adobe') {
        unavailable.push(name)
      }
      continue
    }
    for (const family of families) {
      const key = family.toLowerCase()
      const existing = byFamily.get(key)
      if (existing) {
        if (!existing.providers.includes(name)) {
          existing.providers.push(name)
        }
      }
      else {
        byFamily.set(key, { family, providers: [name] })
      }
    }
  }

  const entries = [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
  return { entries, byFamily, builtAt: Date.now(), unavailable }
}

export function useCatalogue() {
  building ??= build()
  return building
}

export interface SearchOptions {
  query?: string
  provider?: ProviderName
  limit?: number
  offset?: number
}

/**
 * Rank families for a query: exact match, then prefix, then word boundary, then substring. Not
 * fuzzy, because a typo returning the wrong family is worse than returning nothing.
 */
export async function searchCatalogue({ query = '', provider, limit = 60, offset = 0 }: SearchOptions) {
  const catalogue = await useCatalogue()
  const needle = query.trim().toLowerCase()

  let pool = catalogue.entries
  if (provider) {
    pool = pool.filter(entry => entry.providers.includes(provider))
  }

  let ranked: CatalogueEntry[]
  if (!needle) {
    ranked = pool
  }
  else {
    const buckets: CatalogueEntry[][] = [[], [], [], []]
    for (const entry of pool) {
      const haystack = entry.family.toLowerCase()
      if (haystack === needle) {
        buckets[0]!.push(entry)
      }
      else if (haystack.startsWith(needle)) {
        buckets[1]!.push(entry)
      }
      else if (haystack.split(/\s+/).some(word => word.startsWith(needle))) {
        buckets[2]!.push(entry)
      }
      else if (haystack.includes(needle)) {
        buckets[3]!.push(entry)
      }
    }
    ranked = buckets.flat()
  }

  return {
    total: ranked.length,
    families: ranked.slice(offset, offset + limit),
    unavailable: catalogue.unavailable,
  }
}

export async function lookupFamily(family: string) {
  const catalogue = await useCatalogue()
  return catalogue.byFamily.get(family.trim().toLowerCase())
}
