import { createStorage } from 'unstorage'
import { describe, expect, it, vi } from 'vitest'

import { createCachedAsyncStorage, memoryStorage } from '../src/cache'
import { createUnifont, defineFontProvider } from '../src/index'

describe('cache storage', () => {
  it('memory storage`', async () => {
    const storage = memoryStorage()

    await storage.setItem('key', 'value')
    expect(await storage.getItem('key')).toBe('value')
  })

  const storageTypes = { unstorage: createStorage(), memoryStorage: memoryStorage() }

  it.each(Object.entries(storageTypes))('createAsyncStorage works with %s', async (name, storage) => {
    const asyncStorage = createCachedAsyncStorage(storage)

    await asyncStorage.setItem('key', 'value')
    expect(await asyncStorage.getItem('key')).toBe('value')

    const setter = vi.fn(() => 'value')
    expect(await asyncStorage.getItem('key', () => setter())).toBe('value')
    expect(setter).toHaveBeenCalledTimes(0)
    expect(await asyncStorage.getItem('other', () => setter())).toBe('value')
    expect(setter).toHaveBeenCalledTimes(1)

    expect(await asyncStorage.getItem('unset')).toBe(null)
  })

  it('unifont works with custom storage', async () => {
    const customStorage = {
      getItem: vi.fn(() => 'value'),
      setItem: vi.fn(),
    }
    const provider = defineFontProvider('custom-storage', async (_options, ctx) => {
      await ctx.storage.setItem('key', 'value')
      return {
        async resolveFont() {
          await ctx.storage.setItem('another-key', 'value')
          await ctx.storage.getItem('key')
          return { fonts: [] }
        },
      }
    })
    const unifont = await createUnifont([provider()], { storage: customStorage })
    await unifont.resolveFont('Poppins')

    expect(customStorage.getItem).toHaveBeenCalledWith(expect.stringMatching(/key$/))
    expect(customStorage.setItem).toHaveBeenCalledWith(
      expect.stringMatching(/key$/),
      expect.objectContaining({ data: 'value' }),
    )
    expect(customStorage.setItem).toHaveBeenCalledWith(
      expect.stringMatching(/another-key$/),
      expect.objectContaining({ data: 'value' }),
    )
  })

  describe('namespace option', () => {
    it('preserves string fragments in cache key', async () => {
      const storage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      }
      const cached = createCachedAsyncStorage(storage, {
        namespace: ['provider-name', { a: 1 }, 'variant-a'],
      })
      await cached.setItem('test-key', 'data')

      const cacheKey = storage.setItem.mock.calls.at(0)?.at(0) as string | undefined
      expect(cacheKey).toContain('provider-name')
      expect(cacheKey).toContain('variant-a')
    })

    it('generates different keys for different object fragments', async () => {
      const storage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      }

      const cachedA = createCachedAsyncStorage(storage, {
        namespace: [{ variant: 'A' }],
      })
      const cachedB = createCachedAsyncStorage(storage, {
        namespace: [{ variant: 'B' }],
      })
      await cachedA.setItem('key', 'data')
      await cachedB.setItem('key', 'data')

      const keyA = storage.setItem.mock.calls.at(0)?.at(0) as string | undefined
      const keyB = storage.setItem.mock.calls.at(1)?.at(0) as string | undefined

      expect(storage.setItem).toHaveBeenCalledTimes(2)
      expect(keyA).toBeDefined()
      expect(keyB).toBeDefined()
      expect(keyA).not.toBe(keyB)
    })

    it.each([
      { input: 'provider/name' },
      { input: 'provider@v2' },
      { input: 'provider name' },
      { input: 'provider:name' },
    ])('sanitizes "$input" in fragments', async ({ input }) => {
      const storage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      }
      const cached = createCachedAsyncStorage(storage, {
        namespace: [input],
      })

      await cached.setItem('test-key', 'data')

      const cacheKey = storage.setItem.mock.calls.at(0)?.at(0) as string | undefined
      expect(cacheKey).not.toContain(input)
    })
  })
})
