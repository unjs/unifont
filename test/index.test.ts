import { describe, expect, it } from 'vitest'
import { createUnifont } from '../src'

describe('unifont', () => {
  it('works with no providers', async () => {
    const unifont = await createUnifont([])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
  })
})
