import type { StacksResponse } from '#shared/types'
import { didFor } from '#server/utils/pds'
import { stacksByDid } from '#server/utils/stacks'
import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

/** Read from their repo rather than from an index, so the list is complete. */
export default defineEventHandler(async (event): Promise<StacksResponse> => {
  const handle = getRouterParam(event, 'handle') || ''
  const did = await didFor(handle)
  if (!did) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No account answers to \`${handle}\`.` })
  }

  return { stacks: await stacksByDid(did) }
})
