import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { sanitizeFontSource } from '../utils'

describe('fontshare', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    expect(await unifont.resolveFont('NonExistent Font').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont('Satoshi', { weights: ['1100'] }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts: normal } = await unifont.resolveFont('Panchang')
    expect(normal.every(f => f.style === 'normal')).toBe(true)

    const { fonts } = await unifont.resolveFont('Satoshi', { styles: ['normal'] })
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
    const { fonts } = await unifont.resolveFont('Ranade', {
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
    const names = await unifont.listFonts()
    expect(names!.length > 0).toEqual(true)
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont('Tanker', {
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(1)
  })
})
