/* eslint-disable antfu/consistent-list-newline */
import { describe, expect, it, vi } from 'vitest'
import { createUnifont, defineFontProvider, providers } from '../src'

describe('unifont', () => {
  it('works with no providers', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // @ts-expect-error at least a provider is required
    const unifont = await createUnifont([])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
    await unifont.resolveFont('Poppins', {}, ['non-existent'])
    expect(console.error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('works with a non existent provider', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unifont = await createUnifont([providers.google()])
    // @ts-expect-error invalid provider
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

  it('retries on network errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error('Network Error')),
    )
    const unifont = await createUnifont([
      providers.google(),
    ])
    const { fonts } = await unifont.resolveFont('Poppins')
    expect(fonts).toMatchInlineSnapshot(`[]`)
    expect(console.warn).toHaveBeenCalledTimes(3)
    expect(console.warn).toHaveBeenNthCalledWith(1, 'Could not fetch from `https://fonts.google.com/metadata/fonts`. Will retry in `1000ms`. `3` retries left.')
    expect(console.warn).toHaveBeenNthCalledWith(2, 'Could not fetch from `https://fonts.google.com/metadata/fonts`. Will retry in `1000ms`. `2` retries left.')
    expect(console.warn).toHaveBeenNthCalledWith(3, 'Could not fetch from `https://fonts.google.com/metadata/fonts`. Will retry in `1000ms`. `1` retries left.')
    expect(console.error).toHaveBeenCalledWith(
      'Could not initialize provider `google`. `unifont` will not be able to process fonts provided by this provider.',
      expect.objectContaining({}),
    )
    warn.mockRestore()
    error.mockRestore()
    // @ts-expect-error globalThis.fetch is altered
    globalThis.fetch.mockRestore()
  })

  it('throws if a provider fails to initialize and throwOnError is enabled', async () => {
    await expect(() => createUnifont([
      defineFontProvider('bad-provider', () => { throw new Error('test') })(),
    ], { throwOnError: true })).rejects.toThrow()
  })

  it('throws if a provider resolveFont fails and throwOnError is enabled', async () => {
    const unifont = await createUnifont(
      [
        defineFontProvider('bad-provider', () => {
          return {
            resolveFont() {
              throw new Error('test')
            },
          }
        })(),
      ],
      { throwOnError: true },
    )
    await expect(() => unifont.resolveFont('test')).rejects.toThrow()
  })

  describe('listFonts', () => {
    it('works with no providers', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      // @ts-expect-error at least a provider is required
      const unifont = await createUnifont([])
      const names = await unifont.listFonts()
      expect(names).toEqual(undefined)
      expect(console.error).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('works with providers', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const unifont = await createUnifont([
        defineFontProvider('stub', () => ({
          listFonts() {
            return ['foo']
          },
          resolveFont() {
            return { fonts: [] }
          },
        }))()])
      const names = await unifont.listFonts()
      expect(names).toEqual(['foo'])
      expect(console.error).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('handles providers that throw errors when listing names', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const unifont = await createUnifont([
        defineFontProvider('bad-provider', () => ({
          listFonts() {
            throw new Error('test')
          },
          resolveFont() {
            return { fonts: [] }
          },
        }))(),
      ])
      const names = await unifont.listFonts()
      expect(names).toEqual(undefined)
      expect(console.error).toHaveBeenCalledWith(
        'Could not list names from `bad-provider` provider.',
        expect.objectContaining({}),
      )
      error.mockRestore()
    })

    it('throws if it fails and throwOnError is enabled', async () => {
      const unifont = await createUnifont(
        [
          defineFontProvider('bad-provider', () => {
            return {
              resolveFont() {
                return { fonts: [] }
              },
              listFonts() {
                throw new Error('test')
              },
            }
          })(),
        ],
        { throwOnError: true },
      )
      await expect(() => unifont.listFonts()).rejects.toThrow()
    })
  })
})
