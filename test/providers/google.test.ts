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
    expect(await unifont.resolveFont('NonExistent Font').then(r => r.fonts)).toMatchInlineSnapshot(`[]`)

    const { fonts } = await unifont.resolveFont('Poppins')

    expect(fonts).toHaveLength(6)
  })

  it('filters fonts based on provided options', async () => {
    const unifont = await createUnifont([providers.google()])

    const styles = ['normal'] as ResolveFontOptions['styles']
    const weights = ['600']
    const { fonts } = await unifont.resolveFont('Poppins', {
      styles,
      weights,
      subsets: [],
    })

    const resolvedStyles = pickUniqueBy(fonts, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(fonts, fnt => String(fnt.weight))

    expect(fonts).toHaveLength(3)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
  })

  it('supports variable axes', async () => {
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

    const { fonts } = await unifont.resolveFont('Recursive')

    const resolvedStyles = pickUniqueBy(fonts, fnt => fnt.style)
    const resolvedWeights = pickUniqueBy(fonts, fnt => String(fnt.weight))
    const resolvedPriorities = pickUniqueBy(fonts, fnt => fnt.meta?.priority)

    const styles = ['oblique 0deg 15deg', 'normal'] as ResolveFontOptions['styles']

    // Variable wght and separate weights from 300 to 1000
    const weights = ['300,1000', ...([...Array.from({ length: 7 }).keys()].map(i => String(i * 100 + 300)))]

    const priorities = [0, 1]

    expect(fonts).toHaveLength(11)
    expect(resolvedStyles).toMatchObject(styles)
    expect(resolvedWeights).toMatchObject(weights)
    expect(resolvedPriorities).toMatchObject(priorities)
  })

  it('respects glyphs option and resolves optimized font', async () => {
    const unifont = await createUnifont([providers.google({ experimental: { glyphs: { Poppins: ['Hello', 'World'] } } })])

    const { fonts } = await unifont.resolveFont('Poppins', {
      styles: ['normal'],
      weights: ['400'],
      subsets: [],
    })

    // Do not use sanitizeFontSource here, as we must test the optimizer identity in url params
    const remoteFontSources = fonts.flatMap(fnt => fnt.src.flatMap(src => 'url' in src ? src : []))
    const identities = remoteFontSources.map(src => ({
      format: src.format,
      identifier: getOptimizerIdentityFromUrl('google', src.url),
    }),
    )
    const identifiersByFormat = groupBy(identities, src => src.format ?? 'unknown')

    expect(identifiersByFormat).toMatchInlineSnapshot(`
      {
        "woff": [
          {
            "format": "woff",
            "identifier": {
              "kit": "pxiEyp8kv8JHgFVrFJPMcBMSdJLnJzs",
              "skey": "87759fb096548f6d",
            },
          },
        ],
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
})
