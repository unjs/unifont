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

  describe('formats', () => {
    it('woff2', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Tanker',
        provider: 'fontshare',
        formats: ['woff2'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2'])
    })

    it('woff', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Tanker',
        provider: 'fontshare',
        formats: ['woff'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff'])
    })

    it('ttf', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Tanker',
        provider: 'fontshare',
        formats: ['ttf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['truetype'])
    })

    it('eot', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Tanker',
        provider: 'fontshare',
        formats: ['eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('otf', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Tanker',
        provider: 'fontshare',
        formats: ['otf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('several', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Tanker',
        provider: 'fontshare',
        formats: ['woff2', 'woff', 'ttf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2', 'woff', 'truetype'])
    })
  })
})
