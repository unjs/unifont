import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn, pickUniqueBy, sanitizeFontSource } from '../utils'

// Disable fetch retry logic
await vi.hoisted(async () => {
  const { disableFetchRetry } = await import('../utils')
  await disableFetchRetry()
})

describe('adobe', () => {
  it('correctly types options for adobe provider', async () => {
    providers.adobe({ id: [] })
    // @ts-expect-error options must be provided
    providers.adobe()

    expect(true).toBe(true)
  })

  it('handles empty id', async () => {
    // @ts-expect-error id is required
    await createUnifont([providers.adobe({})])
  })

  it('handles string id', async () => {
    const unifont = await createUnifont([providers.adobe({ id: 'sij5ufr' })])
    const { fonts } = await unifont.resolveFont('Aleo')
    expect(fonts.length).toBeGreaterThan(0)
  })

  it('handles getFontProperties correctly', async () => {
    const unifont = await createUnifont([providers.adobe({ id: 'sij5ufr' })])
    const result = await unifont.getFontProperties('Aleo')
    expect(result?.provider).toBe('adobe')
    expect(result?.styles).toEqual(expect.arrayContaining(['normal']))
    expect(result?.weights?.length).toBeGreaterThan(0)

    expect(await unifont.getFontProperties('NonExistent Font')).toEqual(undefined)
  })

  it('handles invalid JSON from adobe api', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const unifont = await createUnifont([providers.adobe({ id: ['bob'] })])

    const restoreFetch = mockFetchReturn(/^https:\/\/typekit.com\/api\//, () => {
      return Promise.resolve({ json: () => Promise.resolve({ kit: '' }) })
    })
    expect(await unifont.resolveFont('Aleo').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    expect(error).toHaveBeenCalledWith(
      'Could not initialize provider `adobe`. `unifont` will not be able to process fonts provided by this provider.',
      expect.objectContaining({}),
    )

    restoreFetch()
    vi.restoreAllMocks()
  })

  it('throws when the adobe api returns no kit metadata', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const restoreFetch = mockFetchReturn(
      /^https:\/\/typekit\.com\/api\/v1\/json\/kits\/nometa\/published/,
      () => new Response(JSON.stringify({ kit: null }), { headers: { 'content-type': 'application/json' } }),
    )

    try {
      const unifont = await createUnifont([providers.adobe({ id: 'nometa' })])

      expect(error).toHaveBeenCalledWith(
        'Could not initialize provider `adobe`. `unifont` will not be able to process fonts provided by this provider.',
        expect.objectContaining({ message: 'No font metadata found in adobe response.' }),
      )
      expect(await unifont.resolveFont('Aleo').then(r => r.fonts)).toEqual([])
    }
    finally {
      restoreFetch()
      vi.restoreAllMocks()
    }
  })

  it('does not refresh again for a family already in the negative cache', async () => {
    let apiCallCount = 0
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/negcache/published')) {
        apiCallCount++
        return new Response(JSON.stringify({
          kit: { id: 'negcache', families: [] },
        }), { headers: { 'content-type': 'application/json' } })
      }
      return originalFetch(url)
    }) as typeof globalThis.fetch

    try {
      const unifont = await createUnifont([providers.adobe({ id: 'negcache' })])
      expect(apiCallCount).toBe(1)

      // First miss triggers a refresh, after which the family is negatively cached.
      expect(await unifont.resolveFont('Missing').then(r => r.fonts)).toEqual([])
      expect(apiCallCount).toBe(2)

      expect(await unifont.resolveFont('Missing').then(r => r.fonts)).toEqual([])
      expect(apiCallCount).toBe(2)

      // A different family still misses, but the debounce window suppresses the refresh.
      expect(await unifont.resolveFont('AlsoMissing').then(r => r.fonts)).toEqual([])
      expect(apiCallCount).toBe(2)
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('derives the css name from the family when css_names is empty', async () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/nocssname/published')) {
        return new Response(JSON.stringify({
          kit: {
            id: 'nocssname',
            families: [{
              id: 'variablefont',
              name: 'Variable Font',
              slug: 'variable-font',
              css_names: [],
              css_stack: 'variable-font, serif',
              variations: ['n4'],
            }],
          },
        }), { headers: { 'content-type': 'application/json' } })
      }
      if (url.includes('nocssname.css')) {
        return new Response(`
          @font-face {
            font-family: "variable-font";
            src: url("https://use.typekit.net/variable.woff2") format("woff2");
            font-weight: 100 900;
            font-style: normal;
          }
        `, { headers: { 'content-type': 'text/css' } })
      }
      return originalFetch(url)
    }) as typeof globalThis.fetch

    try {
      const unifont = await createUnifont([providers.adobe({ id: 'nocssname' })])
      const { fonts } = await unifont.resolveFont('Variable Font')
      expect(fonts).toHaveLength(1)
      expect(fonts[0]!.weight).toEqual([100, 900])
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('awaits an in-flight kit refresh instead of starting a second one', async () => {
    let apiCallCount = 0
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/inflight/published')) {
        apiCallCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return new Response(JSON.stringify({
          kit: { id: 'inflight', families: [] },
        }), { headers: { 'content-type': 'application/json' } })
      }
      return originalFetch(url)
    }) as typeof globalThis.fetch

    try {
      const unifont = await createUnifont([providers.adobe({ id: 'inflight' })])
      expect(apiCallCount).toBe(1)

      // Both misses race: the first starts the refresh, the second awaits it.
      const [a, b] = await Promise.all([
        unifont.resolveFont('MissingOne'),
        unifont.resolveFont('MissingTwo'),
      ])

      expect(a.fonts).toEqual([])
      expect(b.fonts).toEqual([])
      expect(apiCallCount).toBe(2)
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('keeps font faces that declare no weight', async () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/noweight/published')) {
        return new Response(JSON.stringify({
          kit: {
            id: 'noweight',
            families: [{
              id: 'noweight',
              name: 'NoWeight',
              slug: 'noweight',
              css_names: ['noweight'],
              css_stack: 'noweight, serif',
              variations: ['n4'],
            }],
          },
        }), { headers: { 'content-type': 'application/json' } })
      }
      if (url.includes('noweight.css')) {
        return new Response(`
          @font-face {
            font-family: "noweight";
            src: url("https://use.typekit.net/noweight.woff2") format("woff2");
            font-style: normal;
          }
        `, { headers: { 'content-type': 'text/css' } })
      }
      return originalFetch(url)
    }) as typeof globalThis.fetch

    try {
      const unifont = await createUnifont([providers.adobe({ id: 'noweight' })])
      const { fonts } = await unifont.resolveFont('NoWeight')
      expect(fonts).toHaveLength(1)
      expect(fonts[0]!.weight).toBeUndefined()
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('works', async () => {
    const unifont = await createUnifont([providers.adobe({ id: ['sij5ufr', 'grx7wdj'] })])
    expect(await unifont.resolveFont('NonExistent Font').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont('Aleo', {
      weights: ['1100'],
      // @ts-expect-error invalid style
      styles: ['foo'],
    }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts: aleo } = await unifont.resolveFont('Aleo')

    expect(sanitizeFontSource(aleo)).toMatchInlineSnapshot(`
      [
        {
          "display": "auto",
          "src": [
            {
              "format": "woff2",
              "url": "https://use.typekit.net/font",
            },
            {
              "format": "woff",
              "url": "https://use.typekit.net/font",
            },
            {
              "format": "opentype",
              "url": "https://use.typekit.net/font",
            },
          ],
          "stretch": "normal",
          "style": "italic",
          "weight": 400,
        },
        {
          "display": "auto",
          "src": [
            {
              "format": "woff2",
              "url": "https://use.typekit.net/font",
            },
            {
              "format": "woff",
              "url": "https://use.typekit.net/font",
            },
            {
              "format": "opentype",
              "url": "https://use.typekit.net/font",
            },
          ],
          "stretch": "normal",
          "style": "normal",
          "weight": 400,
        },
      ]
    `)

    const weights = ['400']
    const styles = ['italic'] as Array<'italic'>

    const barlow = await unifont.resolveFont('Barlow Semi Condensed', { weights, styles, subsets: [] }).then(r => r.fonts)

    const resolvedStyles = pickUniqueBy(barlow, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(barlow, fnt => String(fnt.weight))

    expect(barlow).toHaveLength(1)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.adobe({ id: ['sij5ufr'] })])
    const names = await unifont.listFonts()
    expect(names!.length > 0).toEqual(true)
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.adobe({ id: 'sij5ufr' })])
    const { fonts } = await unifont.resolveFont('Aleo', {
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(4)
  })

  it('resolves adobe fonts correctly when concurrent non-adobe fonts trigger kit refresh', async () => {
    const originalFetch = globalThis.fetch

    // Track API calls to detect the refresh
    let apiCallCount = 0

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/racetest/published')) {
        apiCallCount++
        // Introduce a small delay to widen the race window
        await new Promise(resolve => setTimeout(resolve, 50))
        return new Response(JSON.stringify({
          kit: {
            id: 'racetest',
            families: [
              {
                id: 'testfont',
                name: 'TestFont',
                slug: 'testfont',
                css_names: ['testfont'],
                css_stack: 'testfont, serif',
                variations: ['n4'],
              },
            ],
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      else if (url.includes('racetest.css')) {
        return new Response(`
          @font-face {
            font-family: "testfont";
            src: url("https://use.typekit.net/test.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
          }
        `, { status: 200, headers: { 'content-type': 'text/css' } })
      }
      return originalFetch(url)
    })

    try {
      // Mock Date.now to make the initial fetchKits look old, so a refresh is triggered
      const realDateNow = Date.now.bind(Date)
      let time = realDateNow()
      vi.spyOn(Date, 'now').mockImplementation(() => time)

      const unifont = await createUnifont([providers.adobe({ id: 'racetest' })])
      expect(apiCallCount).toBe(1)

      // Advance time past KIT_REFRESH_TIMEOUT (5 minutes)
      time += 6 * 60 * 1000

      // Concurrently resolve: a non-adobe font (triggers refresh) and an adobe font.
      // Without the fix, the non-adobe font lookup triggers fetchKits(true) which
      // synchronously clears familyMap. The concurrent TestFont lookup would then
      // see an empty map and incorrectly add TestFont to notFoundFamilies.
      const [nonExistent, testFont] = await Promise.all([
        unifont.resolveFont('NonExistentFont'),
        unifont.resolveFont('TestFont'),
      ])

      expect(nonExistent.fonts).toHaveLength(0)
      expect(testFont.fonts.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('resolves adobe fonts correctly when a concurrent refresh clears state mid-flight', async () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/clearrace/published')) {
        await new Promise(resolve => setTimeout(resolve, 50))
        return new Response(JSON.stringify({
          kit: {
            id: 'clearrace',
            families: [
              {
                id: 'aleo',
                name: 'Aleo',
                slug: 'aleo',
                css_names: ['aleo'],
                css_stack: 'aleo, serif',
                variations: ['n4', 'i4'],
              },
              {
                id: 'barlow',
                name: 'Barlow',
                slug: 'barlow',
                css_names: ['barlow'],
                css_stack: 'barlow, sans-serif',
                variations: ['n4'],
              },
            ],
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      else if (url.includes('clearrace.css')) {
        await new Promise(resolve => setTimeout(resolve, 50))
        return new Response(`
          @font-face {
            font-family: "aleo";
            src: url("https://use.typekit.net/aleo.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
          }
          @font-face {
            font-family: "barlow";
            src: url("https://use.typekit.net/barlow.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
          }
        `, { status: 200, headers: { 'content-type': 'text/css' } })
      }
      return originalFetch(url)
    })

    try {
      const realDateNow = Date.now.bind(Date)
      let time = realDateNow()
      vi.spyOn(Date, 'now').mockImplementation(() => time)

      const unifont = await createUnifont([providers.adobe({ id: 'clearrace' })])

      // Advance time past KIT_REFRESH_TIMEOUT (5 minutes) so the next miss
      // will trigger fetchKits(true).
      time += 6 * 60 * 1000

      // Order matters: Aleo's resolveFont must run first so its synchronous
      // prefix passes the familyMap.has() check and yields at
      // `await ctx.storage.getItem(...)` *before* NonExistentFont's resolveFont
      // synchronously clears familyMap / fonts.kits at the top of fetchKits.
      const [aleo, nonExistent] = await Promise.all([
        unifont.resolveFont('Aleo'),
        unifont.resolveFont('NonExistentFont'),
      ])

      expect(nonExistent.fonts).toHaveLength(0)
      expect(aleo.fonts.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('refreshes kit metadata when font is not found in cache', async () => {
    let apiCallCount = 0

    const originalFetch = globalThis.fetch

    // Mock the API endpoint to return different kits on subsequent calls
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('typekit.com/api/v1/json/kits/test123/published')) {
        apiCallCount++

        if (apiCallCount === 1) {
          // First API call - return kit without NewFont
          return new Response(JSON.stringify({
            kit: {
              id: 'test123',
              families: [
                {
                  id: 'aleo',
                  name: 'Aleo',
                  slug: 'aleo',
                  css_names: ['aleo'],
                  css_stack: 'aleo, serif',
                  variations: ['n4', 'i4'],
                },
              ],
            },
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
        else {
          // Second API call - return kit with NewFont
          return new Response(JSON.stringify({
            kit: {
              id: 'test123',
              families: [
                {
                  id: 'aleo',
                  name: 'Aleo',
                  slug: 'aleo',
                  css_names: ['aleo'],
                  css_stack: 'aleo, serif',
                  variations: ['n4', 'i4'],
                },
                {
                  id: 'newfont',
                  name: 'NewFont',
                  slug: 'newfont',
                  css_names: ['newfont'],
                  css_stack: 'newfont, sans-serif',
                  variations: ['n4', 'n7'],
                },
              ],
            },
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
      }
      else if (url.includes('test123.css')) {
        // Mock CSS response
        return new Response(`
          @font-face {
            font-family: "newfont";
            src: url("https://use.typekit.net/font.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
          }
        `, { status: 200, headers: { 'content-type': 'text/css' } })
      }
      // For all other URLs, let the original fetch handle it or throw
      return originalFetch(url)
    })

    try {
      // Initialize unifont with the initial kit (without NewFont)
      const unifont = await createUnifont([providers.adobe({ id: 'test123' })])
      expect(apiCallCount).toBe(1)

      // Verify NewFont is not initially available
      const initialFonts = await unifont.listFonts()
      expect(initialFonts).toEqual(expect.arrayContaining(['Aleo']))
      expect(initialFonts).not.toContain('NewFont')

      // Try to resolve NewFont - this should trigger a refetch
      const result = await unifont.resolveFont('NewFont')

      // Ensure the font is now available
      expect(result).toBeDefined()
      expect(result.fonts).toBeDefined()
      expect(result.fonts.length).toBeGreaterThan(0)
    }
    finally {
      // Restore original fetch
      globalThis.fetch = originalFetch
    }
  })
})
