import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { getOptimizerIdentityFromUrl, groupBy, sanitizeFontSource } from '../utils'

describe('googleicons', () => {
  it('works', async () => {
    const unifont = await createUnifont([providers.googleicons()])
    expect(await unifont.resolveFont({ fontFamily: 'Poppins', provider: 'googleicons' }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    const { fonts } = await unifont.resolveFont({ fontFamily: 'Material Symbols Outlined', provider: 'googleicons' })
    const { fonts: legacy } = await unifont.resolveFont({ fontFamily: 'Material Icons Outlined', provider: 'googleicons' })
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
      ]
    `)

    expect(sanitizeFontSource(legacy)).toMatchInlineSnapshot(`
      [
        {
          "src": [
            {
              "format": "woff2",
              "url": "https://fonts.gstatic.com/font",
            },
          ],
          "style": "normal",
          "weight": 400,
        },
      ]
    `)
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.googleicons()])
    const names = await unifont.listFonts({ provider: 'googleicons' })
    expect(names!.length > 0).toEqual(true)
  })

  it('respects provider glyphs option and resolves optimized Material Symbols', async () => {
    const unifont = await createUnifont([providers.googleicons({
      experimental: {
        glyphs: {
          'Material Symbols Outlined': ['arrow_right', 'favorite', 'arrow_drop_down'],
        },
      },
    })])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Material Symbols Outlined',
      provider: 'googleicons',
      styles: ['normal'],
      weights: ['400'],
      subsets: [],
    })

    // Do not use sanitizeFontSource here, as we must test the optimizer identity in url params
    const remoteFontSources = fonts.flatMap(fnt => fnt.src.flatMap(src => 'url' in src ? src : []))
    const identities = remoteFontSources.map(src => ({
      format: src.format,
      identifier: getOptimizerIdentityFromUrl('googleicons', src.url),
    }),
    )
    const identifiersByFormat = groupBy(identities, src => src.format ?? 'unknown')

    expect(identifiersByFormat).toMatchInlineSnapshot(`
      {
        "woff2": [
          {
            "format": "woff2",
            "identifier": {
              "kit": "",
              "skey": "",
            },
          },
        ],
      }
    `)
  })

  it('respects family glyphs option and resolves optimized Material Symbols', async () => {
    const unifont = await createUnifont([providers.googleicons()])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Material Symbols Outlined',
      provider: 'googleicons',
      styles: ['normal'],
      weights: ['400'],
      subsets: [],
      options: {

        experimental: {
          glyphs: ['arrow_right', 'favorite', 'arrow_drop_down'],
        },

      },
    })

    // Do not use sanitizeFontSource here, as we must test the optimizer identity in url params
    const remoteFontSources = fonts.flatMap(fnt => fnt.src.flatMap(src => 'url' in src ? src : []))
    const identities = remoteFontSources.map(src => ({
      format: src.format,
      identifier: getOptimizerIdentityFromUrl('googleicons', src.url),
    }),
    )
    const identifiersByFormat = groupBy(identities, src => src.format ?? 'unknown')

    expect(identifiersByFormat).toMatchInlineSnapshot(`
      {
        "woff2": [
          {
            "format": "woff2",
            "identifier": {
              "kit": "",
              "skey": "",
            },
          },
        ],
      }
    `)
  })

  describe('formats', () => {
    it('woff2', async () => {
      const unifont = await createUnifont([providers.googleicons()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Material Symbols Outlined',
        provider: 'googleicons',
        formats: ['woff2'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2'])
    })

    it('woff', async () => {
      const unifont = await createUnifont([providers.googleicons()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Material Symbols Outlined',
        provider: 'googleicons',
        formats: ['woff'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(7)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual(['woff'])
    })

    it('ttf', async () => {
      const unifont = await createUnifont([providers.googleicons()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Material Symbols Outlined',
        provider: 'googleicons',
        formats: ['ttf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(7)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual(['truetype'])
    })

    it('eot', async () => {
      const unifont = await createUnifont([providers.googleicons()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Material Symbols Outlined',
        provider: 'googleicons',
        formats: ['eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(7)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual([undefined])
    })

    it('otf', async () => {
      const unifont = await createUnifont([providers.googleicons()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Material Symbols Outlined',
        provider: 'googleicons',
        formats: ['otf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('several', async () => {
      const unifont = await createUnifont([providers.googleicons()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Material Symbols Outlined',
        provider: 'googleicons',
        formats: ['woff2', 'woff', 'ttf', 'eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(8)
      expect(Array.from(new Set(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))))).toStrictEqual(['woff2', undefined, 'woff', 'truetype'])
    })
  })
})
