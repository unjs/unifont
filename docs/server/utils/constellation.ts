import { STACK_APP_URI, STACK_COLLECTION } from '#shared/atproto'

const CONSTELLATION = 'https://constellation.microcosm.blue'

/** The public instance asks callers to identify themselves. */
const USER_AGENT = 'unifont.dev (https://unifont.dev, @danielroe.dev)'

export interface BacklinkRecord {
  did: string
  rkey: string
}

interface BacklinksResponse {
  total: number
  records: BacklinkRecord[]
}

async function constellation<T>(path: string, params: Record<string, string | number>) {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))
  const response = await fetch(`${CONSTELLATION}/xrpc/${path}?${query}`, {
    headers: { 'user-agent': USER_AGENT, 'accept': 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`constellation ${path}: ${response.status}`)
  }
  return await response.json() as T
}

/** `path` names the field holding the link, dotted, with `[]` for a list. Newest first. */
function backlinks(subject: string, collection: string, path: string, limit = 24) {
  return constellation<BacklinksResponse>('blue.microcosm.links.getBacklinks', {
    subject,
    source: `${collection}:${path}`,
    limit: Math.min(limit, 100),
  })
}

export function recentStacks(limit = 24) {
  return backlinks(STACK_APP_URI, STACK_COLLECTION, 'app', limit)
}

export function stacksUsing(familyUri: string, limit = 12) {
  return backlinks(familyUri, STACK_COLLECTION, 'roles[].uri', limit)
}
