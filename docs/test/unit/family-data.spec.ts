import { describe, expect, it } from 'vitest'
import { cachedFamilyData, familyDataKey, toFamilySummary } from '../../app/composables/useFamilyData'

describe('familyDataKey', () => {
  it('keeps explicitly requested providers separate from the cascade', () => {
    expect(familyDataKey('Grenze Gotisch')).toBe('font-Grenze%20Gotisch')
    expect(familyDataKey('Grenze Gotisch', 'fontsource')).toBe('font-Grenze%20Gotisch?provider=fontsource')
  })

  it('keeps provider and family URL components unambiguous', () => {
    expect(familyDataKey('A/B', 'font source')).toBe('font-A%2FB?provider=font%20source')
  })
})

describe('toFamilySummary', () => {
  it('omits the face data after preserving the metadata and its count', () => {
    const summary = toFamilySummary({
      family: 'Grenze Gotisch',
      provider: 'fontsource',
      fonts: [{}, {}, {}],
    } as Parameters<typeof toFamilySummary>[0])

    expect(summary).toEqual({
      family: 'Grenze Gotisch',
      provider: 'fontsource',
      faces: 3,
    })
  })
})

describe('cachedFamilyData', () => {
  const key = familyDataKey('Grenze Gotisch', 'fontsource')
  const summary = { provider: 'fontsource', faces: 3 }
  const hydratingApp = {
    isHydrating: true,
    payload: { data: { [key]: summary } },
  }

  it('uses the matching server payload while hydrating', () => {
    expect(cachedFamilyData(key, hydratingApp, 'initial')).toBe(summary)
  })

  it('does not reuse data for a refetch', () => {
    expect(cachedFamilyData(key, hydratingApp, 'watch')).toBeUndefined()
  })
})
