import type { BacklinkRecord } from './constellation'
import type { PublishedStack, StackRecord } from '#shared/types'
import { familyUri, STACK_COLLECTION } from '#shared/atproto'
import { defineCachedFunction } from 'nitro/cache'
import { recentStacks, stacksUsing } from './constellation'
import { getRecord, listRecords, profileFor } from './pds'

/** Drops records the index still lists but their repository no longer serves. */
export async function hydrate(records: BacklinkRecord[]): Promise<PublishedStack[]> {
  const stacks = await Promise.all(records.map(async ({ did, rkey }) => {
    try {
      const [record, author] = await Promise.all([
        getRecord<StackRecord>(did, STACK_COLLECTION, rkey),
        profileFor(did),
      ])
      return { rkey, author, stack: record.value }
    }
    catch {
      return null
    }
  }))

  return stacks.filter((stack): stack is PublishedStack => stack !== null)
}

/** A list costs one index request plus one per repository behind it, so it is cached. */
export const recentlyPublished = defineCachedFunction(async (limit: number) => {
  const { records, total } = await recentStacks(limit)
  return { stacks: await hydrate(records), total }
}, { name: 'stacks-recent', maxAge: 120, getKey: limit => String(limit) })

export const publishedWith = defineCachedFunction(async (family: string) => {
  const { records, total } = await stacksUsing(familyUri(family))
  return { stacks: await hydrate(records), total }
}, { name: 'stacks-by-family', maxAge: 300, getKey: family => family.toLowerCase() })

/** Uncached: someone who has just published looks here first. */
export async function stacksByDid(did: string): Promise<PublishedStack[]> {
  const [records, author] = await Promise.all([
    listRecords<StackRecord>(did, STACK_COLLECTION).catch(() => []),
    profileFor(did),
  ])

  return records.map(record => ({ rkey: record.uri.split('/').pop() ?? '', author, stack: record.value }))
}
