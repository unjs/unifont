import { afterEach, describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn, sanitizeFontSource } from '../utils'

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
          "metrics": {
            "ascent": 1010,
            "capHeight": 716,
            "unitsPerEm": 1000,
            "xHeight": 484,
          },
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.fontshare.com/font",
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
          "metrics": {
            "ascent": 1000,
            "capHeight": 727,
            "unitsPerEm": 1000,
            "xHeight": 525,
          },
          "src": [
            {
              "format": "woff2",
              "url": "https://cdn.fontshare.com/font",
            },
          ],
          "style": "italic",
          "weight": 400,
        },
      ]
    `)
  })

  it('returns absolute font URLs', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont('Satoshi', { styles: ['normal'] })
    const urls = fonts.flatMap(font => font.src.flatMap(source => 'url' in source ? source.url : []))

    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every(url => url.startsWith('https://'))).toBe(true)
  })

  it('supports variable fonts', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont('Satoshi', { weights: ['300 900'] })
    expect(fonts.some(fnt => Array.isArray(fnt.weight))).toBe(true)
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const names = await unifont.listFonts()
    expect(names!.length > 0).toEqual(true)
  })

  it('handles getFontProperties correctly', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const result = await unifont.getFontProperties('Satoshi')
    expect(result?.provider).toBe('fontshare')
    expect(result?.formats).toEqual(['woff2', 'woff', 'ttf'])
    expect(result?.styles).toEqual(expect.arrayContaining(['normal', 'italic']))
    expect(result?.subsets).toBeUndefined()
    expect(result?.weights).toEqual(expect.arrayContaining(['400', '300 900']))

    expect(await unifont.getFontProperties('XXX')).toEqual(undefined)
  })

  describe('metrics', () => {
    it('reports metrics per font face', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Satoshi', { weights: ['300', '900'], styles: ['normal'] })
      expect(fonts.map(font => font.metrics)).toMatchInlineSnapshot(`
        [
          {
            "ascent": 1010,
            "capHeight": 710,
            "unitsPerEm": 1000,
            "xHeight": 480,
          },
          {
            "ascent": 1010,
            "capHeight": 740,
            "unitsPerEm": 1000,
            "xHeight": 500,
          },
        ]
      `)
    })

    it('reports metrics for variable font faces', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Satoshi', { weights: ['300 900'], styles: ['normal'] })
      const variable = fonts.find(font => Array.isArray(font.weight))
      expect(variable?.metrics?.unitsPerEm).toBe(1000)
      expect(variable?.metrics?.ascent).toBeGreaterThan(0)
    })

    it('reports metrics for the default style from getFontProperties', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const properties = await unifont.getFontProperties('Satoshi')
      expect(properties?.metrics).toMatchInlineSnapshot(`
        {
          "ascent": 1010,
          "capHeight": 740,
          "unitsPerEm": 1000,
          "xHeight": 500,
        }
      `)
    })

    it.each([
      ['no properties', undefined, undefined],
      ['empty properties', {}, { unitsPerEm: 1000 }],
    ])('handles a style with %s', async (_name, properties, expected) => {
      const restore = mockFetchReturn(/api\.fontshare\.com/, (request) => {
        const url = String(request)
        if (url.includes('/fonts?')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
            has_more: false,
            fonts: [{
              name: 'No Metrics',
              slug: 'no-metrics',
              category: 'Sans Serif',
              axes: [],
              styles: [{ default: true, is_italic: false, is_variable: false, properties, weight: { number: 400, weight: 400 } }],
            }],
          }) })
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(`@font-face {
          font-family: 'No Metrics';
          font-style: normal;
          font-weight: 400;
          src: url(https://cdn.fontshare.com/400.woff2) format('woff2');
        }`) })
      })

      try {
        const unifont = await createUnifont([providers.fontshare()])
        const { fonts } = await unifont.resolveFont('No Metrics', { weights: ['400'], styles: ['normal'], formats: ['woff2'] })
        expect(fonts.length).toBe(1)
        expect(fonts[0]!.metrics).toEqual(expected)
        expect((await unifont.getFontProperties('No Metrics'))?.metrics).toEqual(expected)
      }
      finally {
        restore()
      }
    })
  })

  it('omits a variable weight range when the family has no wght axis', async () => {
    const restore = mockFetchReturn(/api\.fontshare\.com\/v2\/fonts\?/, () => new Response(JSON.stringify({
      has_more: false,
      fonts: [{
        name: 'No Wght',
        slug: 'no-wght',
        axes: [{ property: 'opsz', range_left: 8, range_right: 144, default: 14 }],
        styles: [{ is_italic: false, is_variable: true, weight: { weight: 400, number: 400 } }],
      }],
    })))

    try {
      const unifont = await createUnifont([providers.fontshare()])
      const result = await unifont.getFontProperties('No Wght')
      expect(result?.weights).toEqual([])
    }
    finally {
      restore()
    }
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.fontshare()])
    const { fonts } = await unifont.resolveFont('Tanker', {
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(1)
  })

  describe('formats', () => {
    it('woff2', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Tanker', {
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
      const { fonts } = await unifont.resolveFont('Tanker', {
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
      const { fonts } = await unifont.resolveFont('Tanker', {
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
      const { fonts } = await unifont.resolveFont('Tanker', {
        formats: ['eot'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('otf', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Tanker', {
        formats: ['otf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(0)
    })

    it('several', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Tanker', {
        formats: ['woff2', 'woff', 'ttf'],
        styles: ['normal'],
        subsets: ['latin'],
        weights: ['400'],
      })
      expect(fonts.length).toBe(1)
      expect(fonts.flatMap(font => font.src.map(source => 'name' in source ? source.name : source.format))).toStrictEqual(['woff2', 'woff', 'truetype'])
    })
  })

  describe('weight ranges', () => {
    const staticStyles = [200, 300, 400, 500, 600, 700, 800].map(weight => ({
      is_italic: false,
      is_variable: false,
      weight: { number: weight, weight },
    }))

    const meta = [{
      slug: 'fixture',
      name: 'Fixture',
      category: 'Sans Serif',
      axes: [{ name: 'wght', property: 'wght', range_default: 400, range_left: 200, range_right: 800 }],
      styles: [...staticStyles, { is_italic: false, is_variable: true, weight: { number: 1, weight: 0 } }],
    }]

    let requestedNumbers: string[] = []
    let restore: (() => void) | undefined

    afterEach(() => {
      restore?.()
      restore = undefined
      requestedNumbers = []
    })

    function mockApi() {
      restore?.()
      restore = mockFetchReturn(/api\.fontshare\.com/, (request) => {
        const url = String(request)
        if (url.includes('/fonts?')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fonts: meta, has_more: false }) })
        }
        requestedNumbers = url.split('@')[1]!.split(',')
        const css = requestedNumbers.map(number => `@font-face {
          font-family: 'Fixture';
          font-style: normal;
          font-weight: ${number === '1' ? '200 800' : number};
          src: url(https://cdn.fontshare.com/${number}.woff2) format('woff2');
        }`).join('\n')
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(css) })
      })
    }

    async function resolve(weights: string[]) {
      mockApi()
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Fixture', { weights, styles: ['normal'], subsets: ['latin'], formats: ['woff2'] })
      return fonts
    }

    it('should resolve a range to the static weights it covers', async () => {
      const fonts = await resolve(['400 700'])
      expect(fonts.map(font => font.weight)).toStrictEqual([400, 500, 600, 700])
    })

    it('should resolve a range covering the axis to the variable font', async () => {
      const fonts = await resolve(['100 900'])
      expect(fonts.map(font => font.weight)).toStrictEqual([[200, 800]])
      expect(requestedNumbers).toStrictEqual(['1'])
    })

    it('should resolve a range identically to the equivalent discrete weights', async () => {
      const range = await resolve(['300 500'])
      const discrete = await resolve(['300', '400', '500'])
      expect(range).toStrictEqual(discrete)
    })

    it('should resolve nothing for a range outside the available weights', async () => {
      expect(await resolve(['900 1000'])).toStrictEqual([])
    })
  })

  describe('fallbacks', () => {
    it('returns sans-serif fallback', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fallbacks } = await unifont.resolveFont('Epilogue')
      expect(fallbacks).toStrictEqual(['sans-serif'])
    })

    it('returns serif fallback', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fallbacks } = await unifont.resolveFont('Rowan')
      expect(fallbacks).toStrictEqual(['serif'])
    })

    it('does not return invalid fallback', async () => {
      const unifont = await createUnifont([providers.fontshare()])
      const { fallbacks } = await unifont.resolveFont('Kihim')
      expect(fallbacks).toBeUndefined()
    })
  })
})
