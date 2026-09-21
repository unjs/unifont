import { describe, expect, it, vi } from 'vitest'
import { familyUri } from '../../shared/atproto'

const resolved: string[] = []

vi.mock('nitro/cache', () => ({
  defineCachedFunction: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.stubGlobal('fetch', (url: string) => {
  resolved.push(new URL(url).searchParams.get('handle') ?? '')
  return Promise.resolve(new Response(JSON.stringify({ did: 'did:plc:alice' }), {
    headers: { 'content-type': 'application/json' },
  }))
})

const { didFor } = await import('../../server/utils/pds')

describe('didFor', () => {
  it('should read a handle however a URL spelt it', async () => {
    expect(await didFor('alice.example')).toBe('did:plc:alice')
    expect(await didFor('@alice.example')).toBe('did:plc:alice')
    expect(await didFor('%40alice.example')).toBe('did:plc:alice')
    expect(resolved).toEqual(['alice.example', 'alice.example', 'alice.example'])
  })

  it('should pass a DID straight through', async () => {
    expect(await didFor('did:plc:bob')).toBe('did:plc:bob')
    expect(await didFor('')).toBeNull()
    expect(resolved).toHaveLength(3)
  })
})

describe('stack links', () => {
  it('should write the family key a record is joined on as its own page', () => {
    expect(familyUri('Noto Sans JP')).toBe('https://unifont.dev/fonts/Noto%20Sans%20JP')
    expect(new URL(familyUri('Noto Sans JP')).pathname).toBe('/fonts/Noto%20Sans%20JP')
  })
})
