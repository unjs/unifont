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
      return { json: () => Promise.resolve({ kit: '' }) }
    })
    expect(await unifont.resolveFont('Aleo').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    expect(error).toHaveBeenCalledWith(
      'Could not initialize provider `adobe`. `unifont` will not be able to process fonts provided by this provider.',
      expect.objectContaining({}),
    )

    restoreFetch()
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

  it('handles listNames correctly', async () => {
    const unifont = await createUnifont([providers.adobe({ id: ['sij5ufr'] })])
    const names = await unifont.listNames()
    expect(names!.length > 0).toEqual(true)
  })
})
