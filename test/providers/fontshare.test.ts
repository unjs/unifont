import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { sanitizeFontSource } from '../utils'

describe('fontshare', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont('Satoshi')
    expect(sanitizeFontSource(fonts)).toMatchInlineSnapshot(`
      [
        {
          "display": "swap",
          "src": [
            {
              "format": "woff2",
              "url": "//cdn.fontshare.com/font",
            },
            {
              "format": "woff",
              "url": "//cdn.fontshare.com/font",
            },
            {
              "format": "truetype",
              "url": "//cdn.fontshare.com/font",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
      ]
    `)
  })
})
