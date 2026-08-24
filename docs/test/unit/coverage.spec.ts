import type { FontFaceData } from 'unifont'
import { describe, expect, it } from 'vitest'
import { coverageForText, parseUnicodeRange } from '../../server/utils/coverage'

function face(unicodeRange: string[] | undefined, subset?: string): FontFaceData {
  return { src: [{ url: 'https://example.com/a.woff2' }], unicodeRange, meta: subset ? { subset } : undefined }
}

describe('parseUnicodeRange', () => {
  it('should parse a single codepoint', () => {
    expect(parseUnicodeRange('U+0041')).toEqual({ from: 0x41, to: 0x41 })
  })

  it('should parse a range', () => {
    expect(parseUnicodeRange('U+0000-00FF')).toEqual({ from: 0, to: 0xFF })
  })

  it('should expand wildcards', () => {
    expect(parseUnicodeRange('U+4??')).toEqual({ from: 0x400, to: 0x4FF })
  })

  it('should tolerate a lower-case prefix and surrounding space', () => {
    expect(parseUnicodeRange(' u+2000-206f ')).toEqual({ from: 0x2000, to: 0x206F })
  })

  it('should return undefined for junk', () => {
    expect(parseUnicodeRange('')).toBeUndefined()
    expect(parseUnicodeRange('U+zzzz')).toBeUndefined()
  })
})

describe('coverageForText', () => {
  it('should treat faces without a declared range as unrestricted', () => {
    const result = coverageForText([face(undefined)], 'Zażółć')
    expect(result.unrestricted).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('should treat one range-less face as covering everything the others miss', () => {
    const result = coverageForText([face(['U+0041']), face(undefined)], 'AB')
    expect(result.unrestricted).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('should report characters outside every range as missing', () => {
    const result = coverageForText([face(['U+0000-00FF'])], 'Zażółć')
    expect(result.unrestricted).toBe(false)
    expect(result.covered).toContain('Z')
    expect(result.missing).toContain('ż')
  })

  it('should ignore whitespace when judging coverage', () => {
    const result = coverageForText([face(['U+0041-005A'])], 'A B')
    expect(result.covered).toEqual(['A', 'B'])
    expect(result.missing).toEqual([])
  })

  it('should name the subsets that carry the text', () => {
    const result = coverageForText([
      face(['U+0000-00FF'], 'latin'),
      face(['U+0100-024F'], 'latin-ext'),
    ], 'Aż')
    expect(result.subsets).toEqual(['latin', 'latin-ext'])
  })

  it('should not double-report a repeated character', () => {
    const result = coverageForText([face(['U+0041'])], 'AAA')
    expect(result.covered).toEqual(['A'])
  })
})
