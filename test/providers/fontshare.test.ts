import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { sanitizeFontSource } from '../utils'

describe('fontshare', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    expect(await unifont.resolveFont({ fontFamily: 'NonExistent Font', provider: 'fontshare' }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont({ fontFamily: 'Satoshi', provider: 'fontshare', weights: ['1100'] }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts: normal } = await unifont.resolveFont({ fontFamily: 'Panchang', provider: 'fontshare' })
    expect(normal.every(f => f.style === 'normal')).toBe(true)

    const { fonts } = await unifont.resolveFont({ fontFamily: 'Satoshi', provider: 'fontshare', styles: ['normal'] })
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

  it('handles italic styles', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Ranade',
      provider: 'fontshare',
      styles: ['italic'],
    })
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
          "style": "italic",
          "weight": 400,
        },
      ]
    `)
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const names = await unifont.listFonts({ provider: 'fontshare' })
    expect(names!.length > 0).toEqual(true)
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Tanker',
      provider: 'fontshare',
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(1)
  })
})
