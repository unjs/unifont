import type { ResolveFontOptions } from '../../src'
import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../../src'
import { splitCssIntoSubsets } from '../../src/providers/google'
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

  it('supports variable axes', async () => {
    const unifont = await createUnifont([
      providers.google({
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
      }),
    ])

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

  it('respects glyphs option and resolves optimized font', async () => {
    const unifont = await createUnifont([
      providers.google({
        experimental: { glyphs: { Poppins: ['Hello', 'World'] } },
      }),
    ])

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

  describe('splitCssIntoSubsets()', () => {
    it('associates subsets and css correctly if there are comments', () => {
      expect(
        splitCssIntoSubsets(`
/* vietnamese */
@font-face {
  font-family: 'A';
}
/* latin-ext */
@font-face {
  font-family: 'B';
}
@font-face {
  font-family: 'Still B';
}
/* latin */
@font-face {
  font-family: 'C';
}
body {
  --google-font-color-bungeetint:none;
}
@font-face {
  font-family: 'Still C';
}
`),
      ).toEqual([
        { subset: 'vietnamese', css: '@font-face{font-family:"A"}' },
        { subset: 'latin-ext', css: '@font-face{font-family:"B"}' },
        { subset: 'latin-ext', css: '@font-face{font-family:"Still B"}' },
        { subset: 'latin', css: '@font-face{font-family:"C"}' },
        { subset: 'latin', css: '@font-face{font-family:"Still C"}' },
      ])
    })
  })

  it('it does not associate subsets if there are no comments', () => {
    const input = `
@font-face {
  font-family: 'A';
}
@font-face {
  font-family: 'B';
}
`

    expect(splitCssIntoSubsets(input)).toEqual([{ subset: null, css: input }])
  })

  it('falls back to static weights', async () => {
    const unifont = await createUnifont([providers.google()])
    const { fonts } = await unifont.resolveFont('Lato', {
      weights: ['400 1100'],
    })
    expect(fonts.length).toBe(12)
  })
})
