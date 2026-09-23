import { afterEach, describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn, sanitizeFontSource } from '../utils'

interface FixtureStyle {
  default?: boolean
  is_italic?: boolean
  is_variable?: boolean
  weight: { number: number, weight: number }
  properties: { ascending_leading: number, cap_height: number, x_height: number }
}

interface FixtureFamily {
  slug: string
  name: string
  category: string
  axes: Array<{ name: string, property: string, range_default: number, range_left: number, range_right: number }>
  styles: FixtureStyle[]
}

function family(slug: string, name: string, axis: [number, number], ascent: number, styles: Array<[weight: number, number: number, capHeight: number, xHeight: number, flags?: Partial<FixtureStyle>]>): FixtureFamily {
  return {
    slug,
    name,
    category: 'Sans',
    axes: [{ name: 'wght', property: 'wght', range_default: axis[0], range_left: axis[0], range_right: axis[1] }],
    styles: styles.map(([weight, number, capHeight, xHeight, flags]) => ({
      default: false,
      is_italic: false,
      is_variable: false,
      ...flags,
      weight: { number, weight },
      properties: { ascending_leading: ascent, cap_height: capHeight, x_height: xHeight },
    })),
  }
}

const fixtures: FixtureFamily[] = [
  family('satoshi', 'Satoshi', [300, 900], 1010, [
    [300, 300, 710, 480],
    [300, 301, 710, 480, { is_italic: true }],
    [400, 400, 716, 484],
    [400, 401, 716, 484, { is_italic: true }],
    [500, 500, 723, 489],
    [500, 501, 723, 489, { is_italic: true }],
    [700, 700, 731, 494],
    [700, 701, 731, 494, { is_italic: true }],
    [900, 900, 740, 500],
    [900, 901, 740, 500, { is_italic: true }],
    [0, 1, 740, 500, { is_variable: true, default: true }],
    [0, 2, 740, 500, { is_variable: true, is_italic: true }],
  ]),
  family('panchang', 'Panchang', [200, 800], 970, [
    [200, 200, 682, 491],
    [300, 300, 682, 494],
    [400, 400, 682, 498],
    [500, 500, 682, 501],
    [600, 600, 682, 505],
    [700, 700, 682, 510],
    [800, 800, 682, 517],
    [0, 1, 682, 517, { is_variable: true, default: true }],
  ]),
  family('ranade', 'Ranade', [100, 700], 1000, [
    [100, 100, 727, 521],
    [100, 101, 727, 521, { is_italic: true }],
    [300, 300, 727, 523],
    [300, 301, 727, 523, { is_italic: true }],
    [400, 400, 727, 525],
    [400, 401, 727, 525, { is_italic: true }],
    [500, 500, 727, 528],
    [500, 501, 727, 528, { is_italic: true }],
    [700, 700, 727, 531],
    [700, 701, 727, 531, { is_italic: true }],
    [0, 1, 727, 531, { is_variable: true, default: true }],
    [0, 2, 727, 531, { is_variable: true, is_italic: true }],
  ]),
]

function stylesheet(slug: string, numbers: string[]) {
  const font = fixtures.find(f => f.slug === slug)!
  const axis = font.axes[0]!
  return numbers.map((number) => {
    const style = font.styles.find(s => String(s.weight.number) === number)!
    const weight = style.is_variable ? `${axis.range_left} ${axis.range_right}` : style.weight.weight
    const file = `//cdn.fontshare.com/wf/${slug}-${number}`
    return `@font-face {
  font-family: '${font.name}';
  src: url('${file}.woff2') format('woff2'),
       url('${file}.woff') format('woff'),
       url('${file}.ttf') format('truetype');
  font-weight: ${weight};
  font-display: swap;
  font-style: ${style.is_italic ? 'italic' : 'normal'};
}`
  }).join('\n')
}

let restoreFetch: (() => void) | undefined

function mockFontshare() {
  restoreFetch = mockFetchReturn(/api\.fontshare\.com/, (request) => {
    const url = String(request)
    if (url.includes('/fonts?')) {
      return new Response(JSON.stringify({ has_more: false, fonts: fixtures }))
    }
    const [slug, numbers] = url.split('f[]=')[1]!.split('@') as [string, string]
    return new Response(stylesheet(slug, numbers.split(',')))
  })
}

describe('fontshare', () => {
  afterEach(() => {
    restoreFetch?.()
    restoreFetch = undefined
  })

  it('works', async () => {
    mockFontshare()
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
    mockFontshare()
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

  it('advances pagination by the page size', async () => {
    const offsets: string[] = []
    const page = (start: number, count: number, hasMore: boolean) => ({
      has_more: hasMore,
      fonts: Array.from({ length: count }, (_, index) => ({
        slug: `family-${start + index}`,
        name: `Family ${start + index}`,
        category: 'Sans Serif',
        axes: [],
        styles: [],
      })),
    })

    const restore = mockFetchReturn(/api\.fontshare\.com\/v2\/fonts\?/, (request) => {
      const offset = new URL(String(request)).searchParams.get('offset')!
      offsets.push(offset)
      return new Response(JSON.stringify(offset === '0' ? page(0, 100, true) : page(100, 1, false)))
    })

    try {
      const unifont = await createUnifont([providers.fontshare()])
      expect(await unifont.listFonts()).toHaveLength(101)
      expect(offsets).toStrictEqual(['0', '100'])
    }
    finally {
      restore()
    }
  })

  it('handles getFontProperties correctly', async () => {
    mockFontshare()
    const unifont = await createUnifont([providers.fontshare()])
    const result = await unifont.getFontProperties('Satoshi')
    expect(result?.provider).toBe('fontshare')
    expect(result?.formats).toEqual(['woff2', 'woff', 'ttf'])
    expect(result?.styles).toEqual(expect.arrayContaining(['normal', 'italic']))
    expect(result?.subsets).toBeUndefined()
    expect(result?.weights).toEqual(expect.arrayContaining(['400', '300 900']))
    expect(result?.axes).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: 'wght', min: 300, max: 900 }),
    ]))

    expect(await unifont.getFontProperties('XXX')).toEqual(undefined)
  })

  describe('metrics', () => {
    it('reports metrics per font face', async () => {
      mockFontshare()
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
      mockFontshare()
      const unifont = await createUnifont([providers.fontshare()])
      const { fonts } = await unifont.resolveFont('Satoshi', { weights: ['300 900'], styles: ['normal'] })
      const variable = fonts.find(font => Array.isArray(font.weight))
      expect(variable?.metrics?.unitsPerEm).toBe(1000)
      expect(variable?.metrics?.ascent).toBeGreaterThan(0)
    })

    it('reports metrics for the default style from getFontProperties', async () => {
      mockFontshare()
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
      const restoreFixture = mockFetchReturn(/api\.fontshare\.com/, (request) => {
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
        restoreFixture()
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
