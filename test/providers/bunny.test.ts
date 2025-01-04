import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'

describe('bunny', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.bunny()])
    expect(await unifont.resolveFont('NonExistent Font').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont('Abel', { weights: ['1100'] }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    const { fonts } = await unifont.resolveFont('Abel')
    expect(fonts).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://fonts.bunny.net/abel/files/abel-latin-400-normal.woff2",
            },
            {
              "format": "woff",
              "url": "https://fonts.bunny.net/abel/files/abel-latin-400-normal.woff",
            },
          ],
          "style": "normal",
          "unicodeRange": [
            "U+0000-00FF",
            "U+0131",
            "U+0152-0153",
            "U+02BB-02BC",
            "U+02C6",
            "U+02DA",
            "U+02DC",
            "U+0304",
            "U+0308",
            "U+0329",
            "U+2000-206F",
            "U+2074",
            "U+20AC",
            "U+2122",
            "U+2191",
            "U+2193",
            "U+2212",
            "U+2215",
            "U+FEFF",
            "U+FFFD",
          ],
          "weight": 400,
        },
      ]
    `)
  })
})
