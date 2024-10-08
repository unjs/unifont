import { describe, expect, it, vi } from 'vitest'
import { createUnifont, defineFontProvider } from '../src'

describe('unifont', () => {
  it('works with no providers', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unifont = await createUnifont([])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
    await unifont.resolveFont('Poppins', {}, ['non-existent'])
    expect(console.error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('sanitizes providers that do not return a valid provider', async () => {
    const unifont = await createUnifont([
      // @ts-expect-error invalid provider
      () => {},
    ])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
  })

  it('handles providers that throw errors in initialisation', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unifont = await createUnifont([
      defineFontProvider('bad-provider', () => { throw new Error('test') })(),
    ])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
    expect(console.error).toHaveBeenCalledWith(
      'Could not initialize provider `bad-provider`. `unifont` will not be able to process fonts provided by this provider.',
      expect.objectContaining({}),
    )
    error.mockRestore()
  })

  it('handles providers that throw errors when resolving fonts', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unifont = await createUnifont([
      defineFontProvider('bad-provider', () => ({ resolveFont() { throw new Error('test') } }))(),
    ])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
    expect(console.error).toHaveBeenCalledWith(
      'Could not resolve font face for `Poppins` from `bad-provider` provider.',
      expect.objectContaining({}),
    )
    error.mockRestore()
  })
})
