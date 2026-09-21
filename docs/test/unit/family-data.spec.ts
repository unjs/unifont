import type { NuxtApp } from '#app'
import { describe, expect, it } from 'vitest'
import { cachedFamilyData, familyDataKey, toFamilySummary } from '../../app/composables/useFamilyData'

describe('familyDataKey', () => {
  it('should keep an explicitly requested provider separate from the cascade', () => {
    expect(familyDataKey('Grenze Gotisch')).toBe('font-Grenze%20Gotisch')
    expect(familyDataKey('Grenze Gotisch', 'fontsource')).toBe('font-Grenze%20Gotisch?provider=fontsource')
  })

  it('should keep provider and family URL components unambiguous', () => {
    expect(familyDataKey('A/B', 'font source')).toBe('font-A%2FB?provider=font%20source')
  })
})

describe('toFamilySummary', () => {
  it('should omit the face data after preserving the metadata and its count', () => {
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
  } as unknown as NuxtApp

  it('should use the matching server payload while hydrating', () => {
    expect(cachedFamilyData(key, hydratingApp, 'initial')).toBe(summary)
  })

  it('should not reuse data for a refetch', () => {
    expect(cachedFamilyData(key, hydratingApp, 'watch')).toBeUndefined()
  })
})
