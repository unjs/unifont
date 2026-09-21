import type { CatalogueEntry } from '../../server/utils/catalogue'
import { describe, expect, it } from 'vitest'
import { matchesFacets } from '../../server/utils/catalogue'

const inter: CatalogueEntry = {
  family: 'Inter',
  providers: ['google'],
  facets: { variable: true, italic: true, subsets: ['latin', 'cyrillic'] },
}

const anton: CatalogueEntry = {
  family: 'Anton',
  providers: ['google'],
  facets: { variable: false, italic: false, subsets: ['latin'] },
}

const unlisted: CatalogueEntry = { family: 'Obscure', providers: ['fontsource'] }

describe('matchesFacets', () => {
  it('should keep every family when no filter is set', () => {
    expect(matchesFacets(unlisted, {})).toBe(true)
    expect(matchesFacets(anton, {})).toBe(true)
  })

  it('should filter on each facet', () => {
    expect(matchesFacets(inter, { variable: true })).toBe(true)
    expect(matchesFacets(anton, { variable: true })).toBe(false)
    expect(matchesFacets(inter, { italic: true })).toBe(true)
    expect(matchesFacets(anton, { italic: true })).toBe(false)
    expect(matchesFacets(inter, { subset: 'cyrillic' })).toBe(true)
    expect(matchesFacets(anton, { subset: 'cyrillic' })).toBe(false)
  })

  it('should combine filters', () => {
    expect(matchesFacets(inter, { variable: true, subset: 'latin' })).toBe(true)
    expect(matchesFacets(inter, { variable: true, subset: 'greek' })).toBe(false)
  })

  it('should drop a family whose facets are unknown once any filter is set', () => {
    expect(matchesFacets(unlisted, { variable: true })).toBe(false)
    expect(matchesFacets(unlisted, { subset: 'latin' })).toBe(false)
  })
})
