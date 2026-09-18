import { defineCachedFunction } from 'nitro/cache'

const APPVIEW = 'https://public.api.bsky.app'
const PLC = 'https://plc.directory'

async function json<T>(url: string) {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`)
  }
  return await response.json() as T
}

const resolveHandle = defineCachedFunction(async (handle: string) => {
  const { did } = await json<{ did: string }>(`${APPVIEW}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`)
  return did
}, { name: 'atproto-handle', maxAge: 60 * 60, getKey: handle => handle.toLowerCase() })

/** A route parameter as written in a URL: `@alice.example`, `alice.example` or a DID. */
export async function didFor(parameter: string) {
  const handle = decodeURIComponent(parameter).trim().replace(/^@/, '')
  if (!handle) {
    return null
  }
  return handle.startsWith('did:') ? handle : await resolveHandle(handle).catch(() => null)
}

/** Reads go to the PDS rather than an app view, so a record type nobody indexes still works. */
const resolvePds = defineCachedFunction(async (did: string) => {
  const document = did.startsWith('did:web:')
    ? await json<DidDocument>(`https://${decodeURIComponent(did.slice('did:web:'.length))}/.well-known/did.json`)
    : await json<DidDocument>(`${PLC}/${encodeURIComponent(did)}`)

  const service = document.service?.find(entry => entry.id === '#atproto_pds' || entry.id.endsWith('#atproto_pds'))
  if (!service?.serviceEndpoint) {
    throw new Error(`${did} publishes no PDS`)
  }
  return service.serviceEndpoint
}, { name: 'atproto-pds', maxAge: 60 * 60, getKey: did => did })

interface DidDocument {
  service?: { id: string, type: string, serviceEndpoint: string }[]
}

interface RepoRecord<T> {
  uri: string
  value: T
}

export async function getRecord<T>(did: string, collection: string, rkey: string) {
  const pds = await resolvePds(did)
  const url = `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`
  return await json<RepoRecord<T>>(url)
}

export async function listRecords<T>(did: string, collection: string, limit = 50) {
  const pds = await resolvePds(did)
  const url = `${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&limit=${limit}`
  const { records } = await json<{ records: RepoRecord<T>[] }>(url)
  return records
}

export interface Profile {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

export const profileFor = defineCachedFunction(async (did: string): Promise<Profile> => {
  try {
    const profile = await json<Profile>(`${APPVIEW}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`)
    return { did, handle: profile.handle, displayName: profile.displayName, avatar: profile.avatar }
  }
  catch {
    return { did, handle: did }
  }
}, { name: 'atproto-profile', maxAge: 60 * 60, getKey: did => did })
