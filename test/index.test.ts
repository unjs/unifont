import { describe, expect, it } from 'vitest'
import { createUnifont, providers } from '../src'

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
    const unifont = await createUnifont([
      providers.google(),
    ])

    const { fonts } = await unifont.resolveFont('Poppins')

    expect(fonts).toHaveLength(6)
  })
})
