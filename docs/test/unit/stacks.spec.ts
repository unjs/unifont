import type { StackRecord } from '#shared/types'
import { describe, expect, it, vi } from 'vitest'
import { hydrate } from '../../server/utils/stacks'
import { getRecord } from '../../server/utils/pds'

vi.mock('../../server/utils/pds', () => ({
  getRecord: vi.fn(),
  profileFor: vi.fn((did: string) => Promise.resolve({ did, handle: `${did}.test` })),
  listRecords: vi.fn(),
}))

const record = (title: string): StackRecord => ({
  title,
  roles: [{ role: 'body', family: 'Inter', uri: 'https://unifont.dev/fonts/Inter' }],
  app: 'https://unifont.dev/stack',
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('hydrate', () => {
  it('should keep the records their repositories still answer for', async () => {
    vi.mocked(getRecord)
      .mockResolvedValueOnce({ uri: 'at://a/one', value: record('One') })
      .mockRejectedValueOnce(new Error('410'))
      .mockResolvedValueOnce({ uri: 'at://c/three', value: record('Three') })

    const stacks = await hydrate([
      { did: 'did:plc:a', rkey: 'one' },
      { did: 'did:plc:b', rkey: 'two' },
      { did: 'did:plc:c', rkey: 'three' },
    ])

    expect(stacks.map(entry => entry.stack.title)).toEqual(['One', 'Three'])
    expect(stacks.map(entry => entry.rkey)).toEqual(['one', 'three'])
    expect(stacks[0]!.author).toEqual({ did: 'did:plc:a', handle: 'did:plc:a.test' })
  })
})
