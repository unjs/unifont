import type { FontFaceData } from 'unifont'

export interface CodepointRange {
  from: number
  to: number
}

/** Parse a CSS `unicode-range` token (`U+0-10FFFF`, `U+4??`, `U+2C60`) into a range. */
export function parseUnicodeRange(token: string): CodepointRange | undefined {
  const value = token.trim().replace(/^u\+/i, '')
  if (!value) {
    return undefined
  }
  if (value.includes('-')) {
    const [from, to] = value.split('-')
    const start = Number.parseInt(from!, 16)
    const end = Number.parseInt(to!, 16)
    return Number.isNaN(start) || Number.isNaN(end) ? undefined : { from: start, to: end }
  }
  if (value.includes('?')) {
    const start = Number.parseInt(value.replaceAll('?', '0'), 16)
    const end = Number.parseInt(value.replaceAll('?', 'F'), 16)
    return Number.isNaN(start) || Number.isNaN(end) ? undefined : { from: start, to: end }
  }
  const single = Number.parseInt(value, 16)
  return Number.isNaN(single) ? undefined : { from: single, to: single }
}

export function rangesForFaces(faces: FontFaceData[]): CodepointRange[] {
  const ranges: CodepointRange[] = []
  for (const face of faces) {
    for (const token of face.unicodeRange ?? []) {
      const range = parseUnicodeRange(token)
      if (range) {
        ranges.push(range)
      }
    }
  }
  return ranges
}

export interface CoverageResult {
  /** `true` when no face declared a `unicode-range`. */
  unrestricted: boolean
  covered: string[]
  missing: string[]
  /** Which subsets carry the sample text, where the provider labels them. */
  subsets: string[]
}

/**
 * Which characters of `text` the resolved faces can render. A face with no `unicode-range` is
 * treated as unrestricted rather than as covering nothing, which is how browsers behave.
 */
export function coverageForText(faces: FontFaceData[], text: string): CoverageResult {
  const ranges = rangesForFaces(faces)
  const characters = [...new Set([...text])].filter(character => !/\s/.test(character))

  // One face without a `unicode-range` applies to every code point, whatever the others declare.
  const anyUnrestricted = faces.some(face => !face.unicodeRange?.length)

  if (anyUnrestricted || !ranges.length) {
    return { unrestricted: true, covered: characters, missing: [], subsets: [] }
  }

  const covered: string[] = []
  const missing: string[] = []
  const subsets = new Set<string>()

  for (const character of characters) {
    const code = character.codePointAt(0)!
    let found = false
    for (const face of faces) {
      const faceRanges = (face.unicodeRange ?? []).map(parseUnicodeRange).filter(Boolean) as CodepointRange[]
      if (faceRanges.some(range => code >= range.from && code <= range.to)) {
        found = true
        if (face.meta?.subset) {
          subsets.add(face.meta.subset)
        }
        break
      }
    }
    ;(found ? covered : missing).push(character)
  }

  return { unrestricted: false, covered, missing, subsets: [...subsets] }
}
