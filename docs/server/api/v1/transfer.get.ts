import type { BaselineTransfer } from '#server/utils/transfer'
import { defineEventHandler, getQuery, HTTPError } from 'nitro/h3'
import { BASELINE } from '#shared/baseline'
import { baselineTransfer } from '#server/utils/transfer'

export interface BaselineTransferResponse {
  /** The selection every figure is quoted against. */
  basis: { weights: string[], styles: string[], subsets: string[], formats: string[] }
  /** `null` for a family no provider could resolve, or whose files reported no length. */
  families: Record<string, BaselineTransfer | null>
}

/** Bytes on the wire for a page of families, all quoted against the same selection. */
export default defineEventHandler(async (event): Promise<BaselineTransferResponse> => {
  const query = getQuery(event)
  const families = String(query.families ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 40)

  if (!families.length) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Pass `?families=Newsreader,Switzer`.' })
  }

  const measured = await Promise.all(families.map(async family => [family, await baselineTransfer(family)] as const))

  event.res.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  return {
    basis: {
      weights: [...BASELINE.weights],
      styles: [...BASELINE.styles],
      subsets: [...BASELINE.subsets],
      formats: [...BASELINE.formats],
    },
    families: Object.fromEntries(measured),
  }
})
