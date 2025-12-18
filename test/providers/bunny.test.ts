import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'

describe('bunny', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.bunny()])
    expect(await unifont.resolveFont({ fontFamily: 'NonExistent Font', provider: 'bunny' }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont({ fontFamily: 'Abel', provider: 'bunny', weights: ['1100'] }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    const { fonts } = await unifont.resolveFont({ fontFamily: 'Abel', provider: 'bunny' })
    expect(fonts).toMatchInlineSnapshot(`
      [
        {
          "meta": {
            "subset": "latin",
          },
          "src": [
            {
              "format": "woff2",
              "url": "https://fonts.bunny.net/abel/files/abel-latin-400-normal.woff2",
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

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.bunny()])
    const names = await unifont.listFonts({ provider: 'bunny' })
    expect(names!.length > 0).toEqual(true)
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.bunny()])
    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Alef',
      provider: 'bunny',
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(4)
  })

  it('filters subsets correctly', async () => {
    const unifont = await createUnifont([providers.bunny()])

    const { fonts: fonts0 } = await unifont.resolveFont({ fontFamily: 'Roboto', provider: 'bunny' })
    expect(fonts0.length).toEqual(14)

    const { fonts: fonts1 } = await unifont.resolveFont({
      fontFamily: 'Roboto',
      provider: 'bunny',
      subsets: ['latin'],
    })
    expect(fonts1.length).toEqual(2)
  })

  describe('formats', () => {
    it('woff2', async () => {
      const unifont = await createUnifont([providers.bunny()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'bunny',
        formats: ['woff2'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual(['woff2'])
    })

    it('woff', async () => {
      const unifont = await createUnifont([providers.bunny()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'bunny',
        formats: ['woff'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual(['woff'])
    })

    it('ttf', async () => {
      const unifont = await createUnifont([providers.bunny()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'bunny',
        formats: ['ttf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('eot', async () => {
      const unifont = await createUnifont([providers.bunny()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'bunny',
        formats: ['eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('otf', async () => {
      const unifont = await createUnifont([providers.bunny()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'bunny',
        formats: ['otf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('several', async () => {
      const unifont = await createUnifont([providers.bunny()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'bunny',
        formats: ['woff2', 'woff'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual(['woff2', 'woff'])
    })
  })
})
