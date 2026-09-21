import { describe, expect, it, vi } from 'vitest'

interface ResolveOptions { options?: { google?: { experimental?: { glyphs?: string[] } } } }

const resolveFont = vi.fn((_family: string, _options: ResolveOptions) => Promise.resolve({
  provider: 'google',
  fonts: [{ src: [{ url: 'https://cdn.example.com/a.woff2', format: 'woff2' }], weight: 400, style: 'normal' }],
}))

vi.mock('../../server/utils/catalogue', () => ({
  lookupFamily: (family: string) => Promise.resolve({ family, providers: ['google'] }),
  searchCatalogue: () => Promise.resolve({ families: [], total: 0, unavailable: [] }),
}))

vi.mock('../../server/utils/unifont', () => ({
  useUnifont: () => Promise.resolve({
    resolveFont,
    getFontProperties: () => Promise.resolve({ weights: ['400'], subsets: ['latin'] }),
  }),
}))

const { sheetFamilies, specimenCss } = await import('../../server/utils/specimens')

describe('specimenCss', () => {
  it('should cut faces to the specimen glyphs only when asked', async () => {
    await specimenCss(['Inter'])
    expect(resolveFont.mock.calls[0]![1].options).toBeUndefined()

    await specimenCss(['Inter'], { glyphs: true })
    expect(resolveFont.mock.calls[1]![1].options?.google?.experimental?.glyphs).toContain('T')
  })
})

const failed = (family: string) => `/* ${family}: no provider could resolve this family */`
const resolved = (family: string) => `/* ${family}: google */\n@font-face { font-family: "${family}"; }`

describe('sheetFamilies', () => {
  it('should count every family and name the ones a sheet could not resolve', () => {
    const css = [resolved('Inter'), failed('Anton'), failed('Erode')].join('\n\n')
    expect(sheetFamilies(css)).toEqual({ total: 3, missing: ['Anton', 'Erode'] })
  })

  it('should find nothing missing in a complete sheet', () => {
    expect(sheetFamilies(resolved('Inter'))).toEqual({ total: 1, missing: [] })
  })

  it('should report an empty sheet as having nothing to refuse', () => {
    expect(sheetFamilies('\n')).toEqual({ total: 0, missing: [] })
  })
})
