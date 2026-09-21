import { useCatalogue } from '#server/utils/catalogue'
import { defineEventHandler } from 'nitro/h3'

export interface FacetsResponse {
  variable: number
  italic: number
  /** Scripts the index knows about, most families first. */
  subsets: { name: string, families: number }[]
  /** Families whose only provider publishes no properties, so no facet filter can keep them. */
  unknown: number
}

/** What the catalogue can be filtered by, and how many families each filter would keep. */
export default defineEventHandler(async (event): Promise<FacetsResponse> => {
  const { facets } = await useCatalogue()
  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  return facets
})
