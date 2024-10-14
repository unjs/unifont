import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { sanitizeFontSource } from '../utils'

describe('googleicons', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.googleicons()])
    expect(await unifont.resolveFont('Poppins').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    const { fonts } = await unifont.resolveFont('Material Symbols Outlined')
    const { fonts: legacy } = await unifont.resolveFont('Material Icons Outlined')
    expect(sanitizeFontSource(fonts)).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": [
            100,
            700,
          ],
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 100,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 200,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 300,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 500,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 600,
        },
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 700,
        },
      ]
    `)

    expect(sanitizeFontSource(legacy)).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
      ]
    `)
  })
})
