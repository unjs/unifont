import type { ResolveFontOptions } from '../../src'
import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { getOptimizerIdentityFromUrl, groupBy, mockFetchReturn, pickUniqueBy } from '../utils'

const MOCK_CSS = `/* latin */
@font-face {
  font-family: 'Mock';
  font-style: normal;
  font-weight: 100 700;
  font-stretch: 100%;
  src: url(https://fonts.gstatic.com/s/mock/v1/mock.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}`

function mockCss2(css = MOCK_CSS) {
  const requests = vi.fn()
  const restore = mockFetchReturn(/fonts\.googleapis\.com\/css2/, () => new Response(css))
  const originalFetch = globalThis.fetch
  globalThis.fetch = (...args: Parameters<typeof fetch>) => {
    if (/fonts\.googleapis\.com\/css2/.test(args[0] as string)) {
      requests(decodeURIComponent(args[0] as string))
    }
    return originalFetch(...args)
  }
  return {
    requests,
    restore: () => {
      globalThis.fetch = originalFetch
      restore()
    },
  }
}

describe('google', () => {
  it('correctly types options', async () => {
    providers.google()

    expect(true).toBe(true)
  })

  it('works', async () => {
    const unifont = await createUnifont([providers.google()])
    expect(await unifont.resolveFont('NonExistent Font').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts } = await unifont.resolveFont('Poppins')

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
    const { fonts } = await unifont.resolveFont('Poppins', {
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

    const { fonts } = await unifont.resolveFont('Recursive', {
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

    const { fonts } = await unifont.resolveFont('Recursive', {
      weights: ['300 1000'],
      options: {
        google: {
          experimental: {
            variableAxis: {
              slnt: [['-15', '0']],
              CASL: [['0', '1']],
              CRSV: ['1'],
              MONO: [['0', '1']],
            },
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

    const { fonts } = await unifont.resolveFont('Roboto')

    expect(fonts.map(fnt => Number(fnt.weight)).every(Boolean)).toBeTruthy()
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.google()])
    const names = await unifont.listFonts()
    expect(names!.length > 0).toEqual(true)
  })

  it('handles getFontProperties correctly', async () => {
    const unifont = await createUnifont([providers.google()])
    const result = await unifont.getFontProperties('Roboto')
    expect(result?.provider).toBe('google')
    expect(result?.formats).toEqual(['woff2', 'woff', 'ttf', 'eot'])
    expect(result?.styles).toEqual(expect.arrayContaining(['normal', 'italic']))
    expect(result?.subsets).toEqual(expect.arrayContaining(['latin', 'latin-ext']))
    expect(result?.weights).toEqual(expect.arrayContaining(['400', '100 900']))

    expect(await unifont.getFontProperties('XXX')).toEqual(undefined)
  })

  it('omits a variable weight range when the family has no wght axis', async () => {
    const restore = mockFetchReturn(/fonts\.google\.com\/metadata\/fonts/, () => new Response(JSON.stringify({
      familyMetadataList: [{
        family: 'No Wght',
        fonts: { 400: {} },
        subsets: ['latin'],
        axes: [{ tag: 'wdth', min: 75, max: 125, defaultValue: 100 }],
      }],
    })))

    try {
      const unifont = await createUnifont([providers.google()])
      const result = await unifont.getFontProperties('No Wght')
      expect(result?.weights).toEqual(['400'])
    }
    finally {
      restore()
    }
  })

  it('respects provider glyphs option and resolves optimized font', async () => {
    const unifont = await createUnifont([providers.google({
      experimental: {
        glyphs: {
          Poppings: ['Hello', 'World'],
        },
      },
    })])

    const { fonts } = await unifont.resolveFont('Poppins', {
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

    const { fonts } = await unifont.resolveFont('Poppins', {
      styles: ['normal'],
      weights: ['400'],
      options: {
        google: {
          experimental: {
            glyphs: ['Hello', 'World'],
          },
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

    const { fonts } = await unifont.resolveFont('Roboto', { subsets: ['latin'] })
    expect(fonts.length).toEqual(2)
  })

  it('resolves the weights reported by getFontProperties', async () => {
    const unifont = await createUnifont([providers.google()])
    const properties = await unifont.getFontProperties('Newsreader')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { fonts } = await unifont.resolveFont('Newsreader', {
      weights: properties!.weights,
      styles: properties!.styles,
      subsets: properties!.subsets,
    })

    expect(fonts.length).toBeGreaterThan(0)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('prefers a variable range over the static weights it covers', async () => {
    const { requests, restore } = mockCss2()
    const unifont = await createUnifont([providers.google()])
    await unifont.resolveFont('Newsreader', {
      formats: ['woff2'],
      styles: ['normal'],
      weights: ['400', '600', '200 800'],
    })

    expect(requests).toHaveBeenCalledTimes(1)
    expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,200..800')
    restore()
  })

  it('requests static weights outside a variable range separately', async () => {
    const { requests, restore } = mockCss2()
    const unifont = await createUnifont([providers.google()])
    await unifont.resolveFont('Newsreader', {
      formats: ['woff2'],
      styles: ['normal'],
      weights: ['200 300', '800'],
    })

    expect(requests).toHaveBeenCalledTimes(2)
    expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,200..300')
    expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,800')
    restore()
  })

  it('resolves to no fonts when the family does not publish the requested style', async () => {
    const { requests, restore } = mockCss2()
    const unifont = await createUnifont([providers.google()])
    const { fonts } = await unifont.resolveFont('Anton', {
      formats: ['woff2'],
      styles: ['italic'],
      weights: ['400'],
    })

    expect(fonts).toStrictEqual([])
    expect(requests).not.toHaveBeenCalled()
    restore()
  })

  it('resolves to no fonts when the family does not publish the requested subsets', async () => {
    const { requests, restore } = mockCss2()
    const unifont = await createUnifont([providers.google()])
    const { fonts } = await unifont.resolveFont('Anton', {
      formats: ['woff2'],
      styles: ['normal'],
      weights: ['400'],
      subsets: ['greek'],
    })

    expect(fonts).toStrictEqual([])
    expect(requests).not.toHaveBeenCalled()
    restore()
  })

  it('falls back to the endpoints of the range for static families', async () => {
    const unifont = await createUnifont([providers.google()])
    const { fonts } = await unifont.resolveFont('Lato', {
      weights: ['400 1100'],
    })
    expect(pickUniqueBy(fonts, fnt => String(fnt.weight)).sort()).toEqual(['400', '900'])
  })

  describe('axis clamping', () => {
    it('clamps a variable weight range to the axis range', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      await unifont.resolveFont('IBM Plex Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['100 900'],
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=IBM Plex Sans:ital,wght@0,100..700')
      restore()
    })

    it('collapses a range that only touches the axis to a static value', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      await unifont.resolveFont('IBM Plex Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['700 1000'],
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=IBM Plex Sans:ital,wght@0,700')
      restore()
    })

    it('drops a weight range that does not overlap the axis', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont('IBM Plex Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['800 1000'],
      })

      expect(fonts).toStrictEqual([])
      expect(requests).not.toHaveBeenCalled()
      restore()
    })

    it('clamps variable axis values and drops unknown axes', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google({
        experimental: {
          variableAxis: {
            'Noto Sans': {
              wdth: [['62', '100']],
              slnt: [['-15', '0']],
            },
          },
        },
      })])
      await unifont.resolveFont('Noto Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['400'],
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Noto Sans:ital,wdth,wght@0,62.5..100,400')
      restore()
    })

    it('clamps a single axis value into range and drops non-numeric ones', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      await unifont.resolveFont('Archivo', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['400'],
        options: {
          google: {
            experimental: {
              variableAxis: { wdth: ['200', 'not-a-number'] },
            },
          },
        },
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,125,400')
      restore()
    })

    it('dedupes weight ranges that clamp onto the same value', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      await unifont.resolveFont('IBM Plex Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['700 800', '700 1000'],
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=IBM Plex Sans:ital,wght@0,700')
      restore()
    })

    it('drops a descending range', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      await unifont.resolveFont('Archivo', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['400'],
        options: {
          google: {
            experimental: {
              variableAxis: { wdth: [['125', '62']] },
            },
          },
        },
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400')
      restore()
    })

    it('leaves in-range variable axis values untouched', async () => {
      const { requests, restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      await unifont.resolveFont('Archivo', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['100 900'],
        options: {
          google: {
            experimental: {
              variableAxis: { wdth: [['62', '125']] },
            },
          },
        },
      })

      expect(requests).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900')
      restore()
    })
  })

  describe('font-stretch', () => {
    it('omits a single-value font-stretch when no width axis was requested', async () => {
      const { restore } = mockCss2()
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont('Noto Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['400'],
      })

      expect(fonts.every(font => font.stretch === undefined)).toBe(true)
      restore()
    })

    it('keeps font-stretch when a width axis was requested', async () => {
      const { restore } = mockCss2(MOCK_CSS.replace('100%', '62.5% 100%'))
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont('Noto Sans', {
        formats: ['woff2'],
        styles: ['normal'],
        weights: ['400'],
        options: {
          google: {
            experimental: {
              variableAxis: { wdth: [['62', '100']] },
            },
          },
        },
      })

      expect(fonts.map(font => font.stretch)).toStrictEqual(['62.5% 100%'])
      restore()
    })
  })

  describe('formats', () => {
    it('woff2', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont('Roboto', {
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
      const { fonts } = await unifont.resolveFont('Roboto', {
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
      const { fonts } = await unifont.resolveFont('Roboto', {
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
      const { fonts } = await unifont.resolveFont('Roboto', {
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
      const { fonts } = await unifont.resolveFont('Roboto', {
        formats: ['otf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('several', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fonts } = await unifont.resolveFont('Roboto', {
        formats: ['woff2', 'woff', 'ttf', 'eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(2)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2', 'woff', 'truetype', undefined])
    })
  })

  describe('fallbacks', () => {
    it('returns sans-serif fallback', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fallbacks } = await unifont.resolveFont('ABeeZee')
      expect(fallbacks).toStrictEqual(['sans-serif'])
    })

    it('returns serif fallback', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fallbacks } = await unifont.resolveFont('Abhaya Libre')
      expect(fallbacks).toStrictEqual(['serif'])
    })

    it('returns monospace fallback', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fallbacks } = await unifont.resolveFont('Anonymous Pro')
      expect(fallbacks).toStrictEqual(['monospace'])
    })

    it('does not return invalid fallback', async () => {
      const unifont = await createUnifont([providers.google()])
      const { fallbacks } = await unifont.resolveFont('Aboreto')
      expect(fallbacks).toBeUndefined()
    })
  })
})
