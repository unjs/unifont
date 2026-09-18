import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/catalogue', () => ({
  lookupFamily: (family: string) => Promise.resolve(
    family.trim().toLowerCase() === 'inter' ? { family: 'Inter', providers: ['google'] } : undefined,
  ),
}))

const { canonicalFamily } = await import('../../server/utils/family')

describe('canonicalFamily', () => {
  it('should answer with the spelling a provider will match', async () => {
    expect(await canonicalFamily('inter')).toBe('Inter')
    expect(await canonicalFamily('INTER')).toBe('Inter')
  })

  it('should leave a name no catalogue knows alone', async () => {
    expect(await canonicalFamily('my-private-face')).toBe('my-private-face')
  })
})
