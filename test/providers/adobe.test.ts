import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { pickUniqueBy } from '../utils'

describe('adobe', () => {
  it('correctly types options for adobe provider', async () => {
    providers.adobe({ id: [] })
    // @ts-expect-error options must be provided
    providers.adobe()

    expect(true).toBe(true)
  })

  it('works', async () => {
    const unifont = await createUnifont([providers.adobe({ id: ['sij5ufr', 'grx7wdj'] })])

    const { fonts: aleo } = await unifont.resolveFont('Aleo')
    const normalised = aleo.map(f => ({
      ...f,
      src: f.src.map(s => ({ ...s, url: 'url' in s ? s.url.replace(/https:\/\/use\.typekit\.net\/.*$/, '<some-font-url>') : undefined })),
    }))

    expect(normalised).toMatchInlineSnapshot(`
      [
        {
          "display": "auto",
          "src": [
            {
              "format": "woff2",
              "url": "<some-font-url>",
            },
            {
              "format": "woff",
              "url": "<some-font-url>",
            },
            {
              "format": "opentype",
              "url": "<some-font-url>",
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
              "url": "<some-font-url>",
            },
            {
              "format": "woff",
              "url": "<some-font-url>",
            },
            {
              "format": "opentype",
              "url": "<some-font-url>",
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
})
