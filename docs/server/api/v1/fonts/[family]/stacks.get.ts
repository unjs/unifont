import type { StacksResponse } from '#shared/types'
import { publishedWith } from '#server/utils/stacks'
import { defineEventHandler } from 'nitro/h3'
import { familyParam } from '#server/utils/family'

export default defineEventHandler(async (event): Promise<StacksResponse> => {
  const family = await familyParam(event)

  try {
    return await publishedWith(family)
  }
  catch {
    return { stacks: [], unavailable: true }
  }
})
