import type { ResolveFontOptions } from '../../src'
import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { getOptimizerIdentityFromUrl, groupBy, pickUniqueBy } from '../utils'

describe('google', () => {
  it('correctly types options', async () => {
    providers.google()

    expect(true).toBe(true)
  })

  it('works', async () => {
    const unifont = await createUnifont([providers.google()])
    expect(await unifont.resolveFont({ fontFamily: 'NonExistent Font', provider: 'google' }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts } = await unifont.resolveFont({ fontFamily: 'Poppins', provider: 'google' })

    expect(fonts).toHaveLength(4)
    expect(fonts[0]?.meta).toMatchInlineSnapshot(`
      {
        "priority": 0,
        "subset": "latin-ext",
      }
    `)
  })

  it('filters fonts based on provided options', async () => {
    const unifont = await createUnifont([providers.google()])

    const styles = ['normal'] as ResolveFontOptions['styles']
    const weights = ['600']
    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Poppins',
      provider: 'google',
      styles,
      weights,
    })

    const resolvedStyles = pickUniqueBy(fonts, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(fonts, fnt => String(fnt.weight))

    expect(fonts).toHaveLength(2)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
  })

  it('supports provider variable axes', async () => {
    const unifont = await createUnifont([providers.google({
      experimental: {
        variableAxis: {
          Recursive: {
            slnt: [['-15', '0']],
            CASL: [['0', '1']],
            CRSV: ['1'],
            MONO: [['0', '1']],
          },
        },
      },
    })])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Recursive',
      provider: 'google',
      weights: ['300 1000'],
    })

    const resolvedStyles = pickUniqueBy(fonts, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(fonts, fnt => String(fnt.weight))
    const resolvedPriorities = pickUniqueBy(fonts, fnt => fnt.meta?.priority)

    const styles = ['oblique 0deg 15deg']

    // Variable wght and separate weights from 300 to 1000
    const weights = ['300,1000']

    const priorities = [0]

    expect(fonts).toHaveLength(4)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
    expect(resolvedPriorities).toMatchObject(priorities)
  })

  it('supports family variable axes', async () => {
    const unifont = await createUnifont([providers.google()])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Recursive',
      provider: 'google',
      weights: ['300 1000'],
      options: {
        experimental: {
          variableAxis: {
            slnt: [['-15', '0']],
            CASL: [['0', '1']],
            CRSV: ['1'],
            MONO: [['0', '1']],
          },
        },
      },
    })

    const resolvedStyles = pickUniqueBy(fonts, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(fonts, fnt => String(fnt.weight))
    const resolvedPriorities = pickUniqueBy(fonts, fnt => fnt.meta?.priority)

    const styles = ['oblique 0deg 15deg']

    // Variable wght and separate weights from 300 to 1000
    const weights = ['300,1000']

    const priorities = [0]

    expect(fonts).toHaveLength(4)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
    expect(resolvedPriorities).toMatchObject(priorities)
  })

  it('does not download variable fonts if a weight range is not specified', async () => {
    const unifont = await createUnifont([providers.google()])

    const { fonts } = await unifont.resolveFont({ fontFamily: 'Roboto', provider: 'google' })

    expect(fonts.map(fnt => Number(fnt.weight)).every(Boolean)).toBeTruthy()
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.google()])
    const names = await unifont.listFonts({ provider: 'google' })
    expect(names!.length > 0).toEqual(true)
  })

  it('respects provider glyphs option and resolves optimized font', async () => {
    const unifont = await createUnifont([providers.google({
      experimental: {
        glyphs: {
          Poppings: ['Hello', 'World'],
        },
      },
    })])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Poppins',
      provider: 'google',
      styles: ['normal'],
      weights: ['400'],
    })

    // Do not use sanitizeFontSource here, as we must test the optimizer identity in url params
    const remoteFontSources = fonts.flatMap(fnt =>
      fnt.src.flatMap(src => ('url' in src ? src : [])),
    )
    const identities = remoteFontSources.map(src => ({
      format: src.format,
      identifier: getOptimizerIdentityFromUrl('google', src.url),
    }))
    const identifiersByFormat = groupBy(
      identities,
      src => src.format ?? 'unknown',
    )

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

  it('respects family glyphs option and resolves optimized font', async () => {
    const unifont = await createUnifont([providers.google()])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Poppins',
      provider: 'google',
      styles: ['normal'],
      weights: ['400'],
      options: {

        experimental: {
          glyphs: ['Hello', 'World'],
        },

      },
    })

    // Do not use sanitizeFontSource here, as we must test the optimizer identity in url params
    const remoteFontSources = fonts.flatMap(fnt =>
      fnt.src.flatMap(src => ('url' in src ? src : [])),
    )
    const identities = remoteFontSources.map(src => ({
      format: src.format,
      identifier: getOptimizerIdentityFromUrl('google', src.url),
    }))
    const identifiersByFormat = groupBy(
      identities,
      src => src.format ?? 'unknown',
    )

    expect(identifiersByFormat).toMatchInlineSnapshot(`
      {
        "woff2": [
          {
            "format": "woff2",
            "identifier": {
              "kit": "pxiEyp8kv8JHgFVrFJXUdVNFIvDDHy0hxgHa",
              "skey": "87759fb096548f6d",
            },
          },
        ],
      }
    `)
  })

  it('filters subsets correctly', async () => {
    const unifont = await createUnifont([providers.google()])

    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Roboto',
      provider: 'google',
      subsets: ['latin'],
    })
    expect(fonts.length).toEqual(2)
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.google()])
    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Lato',
      provider: 'google',
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(12)
  })

  describe('formats', () => {
    it('woff2', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'google',
        formats: ['woff2'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2'])
    })

    it('woff', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'google',
        formats: ['woff'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff'])
    })

    it('ttf', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'google',
        formats: ['ttf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['truetype'])
    })

    it('eot', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'google',
        formats: ['eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual([undefined])
    })

    it('otf', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'google',
        formats: ['otf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('several', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont({
        fontFamily: 'Roboto',
        provider: 'google',
        formats: ['woff2', 'woff', 'ttf', 'eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(2)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2', 'woff', 'truetype', undefined])
    })
  })
})
