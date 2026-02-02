import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn, pickUniqueBy, sanitizeFontSource } from '../utils'

// Disable $fetch retry logic
await vi.hoisted(async () => {
  const { disable$fetchRetry } = await import('../utils')
  await disable$fetchRetry()
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
    const { fonts } = await unifont.resolveFont({ fontFamily: 'Aleo', provider: 'adobe' })
    expect(fonts.length).toBeGreaterThan(0)
  })

  it('handles invalid JSON from adobe api', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const unifont = await createUnifont([providers.adobe({ id: ['bob'] })])

    const restoreFetch = mockFetchReturn(/^https:\/\/typekit.com\/api\//, () => {
      return Promise.resolve({ json: () => Promise.resolve({ kit: '' }) })
    })
    expect(await unifont.resolveFont({ fontFamily: 'Aleo', provider: 'adobe' }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    expect(error).toHaveBeenCalledWith(
      'Could not initialize provider `adobe`. `unifont` will not be able to process fonts provided by this provider.',
      expect.objectContaining({}),
    )

    restoreFetch()
    vi.restoreAllMocks()
  })

  it('works', async () => {
    const unifont = await createUnifont([providers.adobe({ id: ['sij5ufr', 'grx7wdj'] })])
    expect(await unifont.resolveFont({ fontFamily: 'NonExistent Font', provider: 'adobe' }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)
    expect(await unifont.resolveFont({
      fontFamily: 'Aleo',
      provider: 'adobe',
      weights: ['1100'],
      // @ts-expect-error invalid style
      styles: ['foo'],
    }).then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts: aleo } = await unifont.resolveFont({ fontFamily: 'Aleo', provider: 'adobe' })

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
          "style": "normal",
          "weight": 400,
        },
      ]
    `)

    const weights = ['400']
    const styles = ['italic'] as Array<'italic'>

    const barlow = await unifont.resolveFont({ fontFamily: 'Barlow Semi Condensed', provider: 'adobe', weights, styles, subsets: [] }).then(r => r.fonts)

    const resolvedStyles = pickUniqueBy(barlow, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(barlow, fnt => String(fnt.weight))

    expect(barlow).toHaveLength(1)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
  })

  it('handles listFonts correctly', async () => {
    const unifont = await createUnifont([providers.adobe({ id: ['sij5ufr'] })])
    const names = await unifont.listFonts({ provider: 'adobe' })
    expect(names!.length > 0).toEqual(true)
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.adobe({ id: 'sij5ufr' })])
    const { fonts } = await unifont.resolveFont({
      fontFamily: 'Aleo',
      provider: 'adobe',
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(4)
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
      const initialFonts = await unifont.listFonts({ provider: 'adobe' })
      expect(initialFonts).toEqual(expect.arrayContaining(['Aleo']))
      expect(initialFonts).not.toContain('NewFont')

      // Try to resolve NewFont - this should trigger a refetch
      const result = await unifont.resolveFont({ fontFamily: 'NewFont', provider: 'adobe' })

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
