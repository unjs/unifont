import { describe, expect, it, vi } from 'vitest'

interface ResolveOptions { options?: { google?: { experimental?: { glyphs?: string[] } } } }

const resolveFont = vi.fn((_family: string, _options: ResolveOptions) => Promise.resolve({
  provider: 'google',
  fonts: [{ src: [{ url: 'https://cdn.example.com/a.woff2', format: 'woff2' }], weight: 400, style: 'normal' }],
}))

vi.mock('../../server/utils/unifont', () => ({
  useUnifont: () => Promise.resolve({
    resolveFont,
    getFontProperties: () => Promise.resolve({ weights: ['400'], subsets: ['latin'] }),
  }),
}))

const { specimenCss } = await import('../../server/utils/specimens')

describe('specimenCss', () => {
  it('should cut faces to the specimen glyphs only when asked', async () => {
    await specimenCss(['Inter'])
    expect(resolveFont.mock.calls[0]![1].options).toBeUndefined()

    await specimenCss(['Inter'], { glyphs: true })
    expect(resolveFont.mock.calls[1]![1].options?.google?.experimental?.glyphs).toContain('T')
  })
})
