import type { FontFaceData } from 'unifont'
import { faceUrls } from './css'
import { parseUnicodeRange } from './coverage'
import { measureFaces } from './transfer'

export interface BudgetPlan {
  label: string
  faces: number
  files: number
  /** How many files reported a `content-length`. */
  measured: number
  bytes: number
}

/** Ignores whitespace, which every face carries. */
export function codepointsFor(text: string) {
  return [...new Set([...text])].filter(character => !/\s/.test(character)).map(character => character.codePointAt(0)!)
}

/** A face with no `unicode-range` always applies; one with ranges only where the text falls in. */
export function facesForCodepoints(faces: FontFaceData[], codepoints: number[]) {
  return faces.filter((face) => {
    if (!face.unicodeRange?.length) {
      return true
    }
    const ranges = face.unicodeRange.map(parseUnicodeRange).filter(range => range !== undefined)
    return codepoints.some(code => ranges.some(range => code >= range.from && code <= range.to))
  })
}

export async function planFor(label: string, faces: FontFaceData[], options: { download?: boolean } = {}): Promise<BudgetPlan> {
  const urls = faceUrls(faces)
  return { label, faces: faces.length, files: urls.length, ...await measureFaces(urls, options) }
}
