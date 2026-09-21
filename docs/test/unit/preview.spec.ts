import { describe, expect, it } from 'vitest'
import { PREVIEW_MAX, previewText, specimenGlyphs } from '../../shared/featured'

describe('previewText', () => {
  it('should collapse whitespace and trim', () => {
    expect(previewText('  Acme   Corp \n')).toBe('Acme Corp')
  })

  it('should return undefined for empty input', () => {
    expect(previewText(undefined)).toBeUndefined()
    expect(previewText('   ')).toBeUndefined()
  })

  it('should cap length', () => {
    expect(previewText('a'.repeat(200))).toHaveLength(PREVIEW_MAX)
  })
})

describe('specimenGlyphs', () => {
  it('should cover the family name as well as the text, since a card sets both', () => {
    expect(specimenGlyphs('Inter', 'Acme')).toEqual(['A', 'I', 'c', 'e', 'm', 'n', 'r', 't'])
  })

  it('should fall back to the default specimen', () => {
    expect(specimenGlyphs('Inter')).toContain('&')
  })
})
