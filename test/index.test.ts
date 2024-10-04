import { describe, expect, it } from 'vitest'
import { createUnifont, providers, type ResolveFontOptions } from '../src'

// TODO: move to a test/utils folder or something else
// Quick and dirty way to pick into a new array, not needed if the test is un-necessary
function pickUniqueBy<T, K>(arr: T[], by: (arg: T) => K): K[] {
  return [...arr.reduce((acc, fnt) => {
    const prop = by(fnt)
    if (!acc.has(prop))
      acc.add(prop)
    return acc
  }, new Set<K>())]
}

describe('unifont', () => {
  it('works with no providers', async () => {
    const unifont = await createUnifont([])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
  })

  it('correctly types options for providers', async () => {
    providers.google()
    // @ts-expect-error options must be provided
    providers.adobe()

    expect(true).toBe(true)
  })

  it('works with google provider', async () => {
    const unifont = await createUnifont([providers.google()])

    const { fonts } = await unifont.resolveFont('Poppins')

    expect(fonts).toHaveLength(6)
  })

  it('filters the fonts with google provider', async () => {
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
})
