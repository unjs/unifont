import type { PublishedStack } from '#shared/types'
import { recentlyPublished } from '#server/utils/stacks'
import { defineEventHandler, getQuery } from 'nitro/h3'

export interface StacksResponse {
  stacks: PublishedStack[]
  /** How many the index knows about, which can exceed what this page fetched. */
  total?: number
  /** `true` when the backlink index could not be reached. */
  unavailable?: boolean
}

export default defineEventHandler(async (event): Promise<StacksResponse> => {
  const limit = Math.min(Number(getQuery(event).limit) || 24, 100)

  try {
    return await recentlyPublished(limit)
  }
  catch {
    return { stacks: [], unavailable: true }
  }
})
