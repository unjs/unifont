import type { ProviderName } from './unifont'
import { QUERYABLE_PROVIDERS, useProvider } from './unifont'

export interface CatalogueFacets {
  variable: boolean
  italic: boolean
  subsets: string[]
}

export interface CatalogueEntry {
  family: string
  providers: ProviderName[]
  /** Absent where no facet-bearing provider publishes this family. */
  facets?: CatalogueFacets
}

/**
 * Providers whose `getFontProperties()` reads an index they already hold. Fontsource asks the
 * network per variable family, which would be thousands of requests for one build.
 */
const FACET_PROVIDERS = ['google', 'bunny', 'fontshare', 'googleicons'] as const

/** Facets are read a page at a time so that one slow provider cannot stall the whole build. */
const FACET_BATCH = 32

export interface FacetSummary {
  variable: number
  italic: number
  /** Scripts the index knows about, most families first. */
  subsets: { name: string, families: number }[]
  /** Families whose only provider publishes no properties, so no facet filter can keep them. */
  unknown: number
}

interface Catalogue {
  entries: CatalogueEntry[]
  byFamily: Map<string, CatalogueEntry>
  facets: FacetSummary
  builtAt: number
  /** Providers that failed to answer, so the UI can say so rather than under-report. */
  unavailable: ProviderName[]
}

let building: Promise<Catalogue> | undefined
let expiresAt = 0
let refreshing = false

/** How long a build answers for, so a provider that failed once is retried without a restart. */
const TTL = 60 * 60 * 1000

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

  await addFacets([...byFamily.values()])

  const entries = [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
  return { entries, byFamily, facets: summariseFacets(entries), builtAt: Date.now(), unavailable }
}

async function addFacets(entries: CatalogueEntry[]) {
  const instances = new Map<string, Awaited<ReturnType<typeof useProvider>>>()
  for (const name of FACET_PROVIDERS) {
    try {
      instances.set(name, await useProvider(name))
    }
    catch {
      // A provider that did not answer contributed no families either.
    }
  }

  async function facetsFor(entry: CatalogueEntry) {
    for (const name of FACET_PROVIDERS) {
      if (!entry.providers.includes(name)) {
        continue
      }
      const properties = await instances.get(name)?.getFontProperties(entry.family).catch(() => undefined)
      if (!properties) {
        continue
      }
      entry.facets = {
        variable: (properties.weights ?? []).some(weight => weight.includes(' ')),
        italic: (properties.styles ?? []).includes('italic'),
        // `menu` is Google's one-line subset for rendering a family's own name in a picker.
        subsets: (properties.subsets ?? []).filter(subset => subset !== 'menu'),
      }
      return
    }
  }

  for (let index = 0; index < entries.length; index += FACET_BATCH) {
    await Promise.all(entries.slice(index, index + FACET_BATCH).map(facetsFor))
  }
}

function summariseFacets(entries: CatalogueEntry[]): FacetSummary {
  const subsets = new Map<string, number>()
  let variable = 0
  let italic = 0
  let unknown = 0

  for (const entry of entries) {
    if (!entry.facets) {
      unknown += 1
      continue
    }
    variable += entry.facets.variable ? 1 : 0
    italic += entry.facets.italic ? 1 : 0
    for (const subset of entry.facets.subsets) {
      subsets.set(subset, (subsets.get(subset) ?? 0) + 1)
    }
  }

  return {
    variable,
    italic,
    subsets: [...subsets].map(([name, families]) => ({ name, families })).sort((a, b) => b.families - a.families || a.name.localeCompare(b.name)),
    unknown,
  }
}

export function useCatalogue() {
  if (!building) {
    expiresAt = Date.now() + TTL
    building = build()
    return building
  }

  if (Date.now() > expiresAt && !refreshing) {
    refreshing = true
    // Rebuilt in the background, so the stale catalogue keeps answering meanwhile and a failed
    // rebuild changes nothing.
    build()
      .then((next) => {
        building = Promise.resolve(next)
        expiresAt = Date.now() + TTL
      })
      .catch(() => {
        expiresAt = Date.now() + TTL
      })
      .finally(() => {
        refreshing = false
      })
  }

  return building
}

export interface SearchOptions {
  query?: string
  provider?: ProviderName
  /** Any filter also drops families whose facets are unknown. */
  variable?: boolean
  italic?: boolean
  subset?: string
  limit?: number
  offset?: number
}

export function matchesFacets(entry: CatalogueEntry, { variable, italic, subset }: SearchOptions) {
  if (variable === undefined && italic === undefined && !subset) {
    return true
  }
  if (!entry.facets) {
    return false
  }
  if (variable !== undefined && entry.facets.variable !== variable) {
    return false
  }
  if (italic !== undefined && entry.facets.italic !== italic) {
    return false
  }
  return !subset || entry.facets.subsets.includes(subset)
}

/**
 * Rank families for a query: exact match, then prefix, then word boundary, then substring. Not
 * fuzzy, because a typo returning the wrong family is worse than returning nothing.
 */
export async function searchCatalogue({ query = '', provider, variable, italic, subset, limit = 60, offset = 0 }: SearchOptions) {
  const catalogue = await useCatalogue()
  const needle = query.trim().toLowerCase()

  let pool = catalogue.entries
  if (provider) {
    pool = pool.filter(entry => entry.providers.includes(provider))
  }
  pool = pool.filter(entry => matchesFacets(entry, { variable, italic, subset }))

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
