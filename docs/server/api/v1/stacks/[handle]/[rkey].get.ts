import type { PublishedStack, StackRecord } from '#shared/types'
import { STACK_COLLECTION } from '#shared/atproto'
import { didFor, getRecord, profileFor } from '#server/utils/pds'
import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

export default defineEventHandler(async (event): Promise<PublishedStack> => {
  const handle = getRouterParam(event, 'handle') || ''
  const rkey = decodeURIComponent(getRouterParam(event, 'rkey') || '')
  if (!rkey) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'A handle and a record key are required.' })
  }

  const did = await didFor(handle)
  if (!did) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No account answers to \`${handle}\`.` })
  }

  const record = await getRecord<StackRecord>(did, STACK_COLLECTION, rkey).catch(() => null)
  if (!record) {
    throw new HTTPError({ statusCode: 404, statusMessage: `No stack \`${rkey}\` in that account.` })
  }

  return { rkey, author: await profileFor(did), stack: record.value }
})
