import type { FontFaceData } from 'unifont'
import { describe, expect, it } from 'vitest'
import { codepointsFor, facesForCodepoints } from '../../server/utils/budget'

function face(unicodeRange: string[] | undefined, url = 'https://example.com/a.woff2'): FontFaceData {
  return { src: [{ url }], unicodeRange }
}

const latin = face(['U+0000-00FF'])
const cyrillic = face(['U+0400-045F'])
const unrestricted = face(undefined)

describe('codepointsFor', () => {
  it('should ignore whitespace and repeats', () => {
    expect(codepointsFor('aa bb')).toEqual(['a', 'b'].map(character => character.codePointAt(0)))
  })
})

describe('facesForCodepoints', () => {
  it('should keep only the faces the text falls inside', () => {
    expect(facesForCodepoints([latin, cyrillic], codepointsFor('Acme'))).toEqual([latin])
    expect(facesForCodepoints([latin, cyrillic], codepointsFor('Привет'))).toEqual([cyrillic])
  })

  it('should keep both where the text spans them', () => {
    expect(facesForCodepoints([latin, cyrillic], codepointsFor('Acme Привет'))).toHaveLength(2)
  })

  it('should always keep a face that declares no range', () => {
    expect(facesForCodepoints([unrestricted], codepointsFor('Привет'))).toEqual([unrestricted])
  })

  it('should keep nothing for text no face covers', () => {
    expect(facesForCodepoints([latin], codepointsFor('漢字'))).toEqual([])
  })
})
