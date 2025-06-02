import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn, pickUniqueBy, sanitizeFontSource } from '../utils'

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

  it('refetches kit metadata when font is not found in cache', async () => {
    let apiCallCount = 0

    // Mock the API endpoint to return different kits on subsequent calls
    const restoreFetch = mockFetchReturn(
      /^https:\/\/typekit.com\/api\/v1\/json\/kits\/test123\/published/,
      () => {
        apiCallCount++

        if (apiCallCount === 1) {
          // First API call - return kit without NewFont
          return Promise.resolve({
            json: () => Promise.resolve({
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
            }),
          })
        }
        else {
          // Second API call - return kit with NewFont
          return Promise.resolve({
            json: () => Promise.resolve({
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
            }),
          })
        }
      },
    )

    // Add a mock for the CSS file that will be fetched
    mockFetchReturn(
      /^https:\/\/use\.typekit\.net\/test123\.css/,
      () => {
        return Promise.resolve({
          text: () => Promise.resolve(`
            @font-face {
              font-family: "newfont";
              src: url("https://use.typekit.net/font.woff2") format("woff2");
              font-weight: 400;
              font-style: normal;
            }
          `),
        })
      },
    )

    try {
      // Initialize unifont with the initial kit (without NewFont)
      const unifont = await createUnifont([providers.adobe({ id: 'test123' })])
      expect(apiCallCount).toBe(1)

      // Verify NewFont is not initially available
      const initialFonts = await unifont.listFonts()
      expect(initialFonts).not.toContain('NewFont')

      // Try to resolve NewFont - this should trigger a refetch
      const result = await unifont.resolveFont('NewFont')

      // Ensure the font is now available
      expect(result).toBeDefined()
      expect(result.fonts).toBeDefined()
      expect(result.fonts.length).toBeGreaterThan(0)
    }
    finally {
      restoreFetch()
    }
  })
})
