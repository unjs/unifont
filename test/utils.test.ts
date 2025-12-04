import { describe, expect, it } from 'vitest'
import { cleanFontFaces, prepareWeights, splitCssIntoSubsets } from '../src/utils'

describe('utils', () => {
  describe('prepareWeights()', () => {
    it('keeps variable weights if available', () => {
      expect(prepareWeights({
        inputWeights: ['400 900'],
        hasVariableWeights: true,
        weights: [],
      })).toEqual([{ weight: '400 900', variable: true }])
    })

    it('returns nothing if a variable weight has no fallbacks', () => {
      expect(prepareWeights({
        inputWeights: ['300 700'],
        hasVariableWeights: false,
        weights: [],
      })).toEqual([])
    })

    it('returns standard weights as fallbacks for a variable font if available', () => {
      expect(
        prepareWeights({
          inputWeights: ['400 600'],
          hasVariableWeights: false,
          weights: ['300', '400', '500', '600', '700'],
        }),
      ).toEqual([
        { weight: '400', variable: false },
        { weight: '500', variable: false },
        { weight: '600', variable: false },
      ])
    })

    it('returns standard weights if available', () => {
      expect(prepareWeights({
        inputWeights: ['400', '500', '600'],
        hasVariableWeights: false,
        weights: ['300', '400'],
      })).toEqual([{ weight: '400', variable: false }])
    })

    it('deduplicates weights', () => {
      expect(
        prepareWeights({
          inputWeights: ['400 500', '300', '400', '500'],
          hasVariableWeights: false,
          weights: ['300', '400', '500'],
        }),
      ).toEqual([
        { weight: '400', variable: false },
        { weight: '500', variable: false },
        { weight: '300', variable: false },
      ])
    })
  })

  describe('cleanFontFaces()', () => {
    it('does not merge unrelated faces', () => {
      expect(cleanFontFaces([], [])).toMatchInlineSnapshot(`[]`)
      expect(cleanFontFaces([
        {
          src: [],
          style: 'normal',
        },
      ], [])).toMatchInlineSnapshot(`[]`)
      expect(cleanFontFaces([
        {
          src: [{ name: 'foo' }],
          style: 'normal',
        },
      ], [])).toMatchInlineSnapshot(`[
  {
    "src": [
      {
        "name": "foo",
      },
    ],
    "style": "normal",
  },
]`)
      expect(cleanFontFaces([
        {
          src: [{ name: 'foo' }],
          style: 'normal',
        },
        {
          src: [{ name: 'foo' }],
          weight: '400',
        },
      ], [])).toMatchInlineSnapshot(`[
  {
    "src": [
      {
        "name": "foo",
      },
    ],
    "style": "normal",
  },
  {
    "src": [
      {
        "name": "foo",
      },
    ],
    "weight": "400",
  },
]`)
    })

    it('merges related faces', () => {
      expect(cleanFontFaces([
        {
          src: [{ name: 'foo' }],
          style: 'normal',
        },
        {
          src: [{ url: 'bar' }],
          style: 'normal',
        },
      ], [])).toMatchInlineSnapshot(`[
  {
    "src": [
      {
        "name": "foo",
      },
      {
        "url": "bar",
      },
    ],
    "style": "normal",
  },
]`)
    })

    it('dedupes sources', () => {
      expect(cleanFontFaces([
        {
          src: [{ url: 'foo' }, { url: 'bar' }],
          style: 'normal',
        },
        {
          src: [{ url: 'bar' }],
          style: 'normal',
        },
      ], [])).toMatchInlineSnapshot(`[
  {
    "src": [
      {
        "url": "foo",
      },
      {
        "url": "bar",
      },
    ],
    "style": "normal",
  },
]`)
    })

    it('normalizes sources formats', () => {
      expect(cleanFontFaces([
        {
          src: [
            { url: 'a', format: 'woff2' },
            { url: 'b', format: 'woff' },
            { url: 'c', format: 'otf' },
            { url: 'd', format: 'ttf' },
            { url: 'e', format: 'eot' },
            { url: 'f', format: 'truetype' },
            { url: 'g', format: 'opentype' },
            { url: 'h', format: 'embedded-opentype' },
          ],
          style: 'normal',
        },
      ], ['woff2', 'woff', 'ttf', 'otf', 'eot'])).toMatchInlineSnapshot(`[
  {
    "src": [
      {
        "format": "woff2",
        "url": "a",
      },
      {
        "format": "woff",
        "url": "b",
      },
      {
        "format": "opentype",
        "url": "c",
      },
      {
        "format": "truetype",
        "url": "d",
      },
      {
        "format": "embedded-opentype",
        "url": "e",
      },
      {
        "format": "truetype",
        "url": "f",
      },
      {
        "format": "opentype",
        "url": "g",
      },
      {
        "format": "embedded-opentype",
        "url": "h",
      },
    ],
    "style": "normal",
  },
]`)
    })
  })
  describe('splitCssIntoSubsets()', () => {
    it('associates subsets and css correctly if there are comments', () => {
      expect(
        splitCssIntoSubsets(`
/* vietnamese */
@font-face {
  font-family: 'A';
}
/* latin-ext */
@font-face {
  font-family: 'B';
}
@font-face {
  font-family: 'Still B';
}
/* latin */
@font-face {
  font-family: 'C';
}
body {
  --google-font-color-bungeetint:none;
}
@font-face {
  font-family: 'Still C';
}
`),
      ).toEqual([
        { subset: 'vietnamese', css: '@font-face{font-family:"A"}' },
        { subset: 'latin-ext', css: '@font-face{font-family:"B"}' },
        { subset: 'latin-ext', css: '@font-face{font-family:"Still B"}' },
        { subset: 'latin', css: '@font-face{font-family:"C"}' },
        { subset: 'latin', css: '@font-face{font-family:"Still C"}' },
      ])
    })

    it('it does not associate subsets if there are no comments', () => {
      const input = `
@font-face {
  font-family: 'A';
}
@font-face {
  font-family: 'B';
}
`

      expect(splitCssIntoSubsets(input)).toEqual([{ subset: null, css: input }])
    })

    it('it does not associate subsets if comment is not in the right place', () => {
      expect(splitCssIntoSubsets(`
@font-face {
  font-family: 'A';
}
/* latin */

`)).toEqual([{ subset: null, css: '@font-face{font-family:"A"}' }])
    })
  })
})
