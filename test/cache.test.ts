import { createStorage } from 'unstorage'
import { describe, expect, it, vi } from 'vitest'

import { createAsyncStorage, memoryStorage } from '../src/cache'
import { createUnifont, defineFontProvider } from '../src/index'

describe('cache storage', () => {
  it('memory storage`', async () => {
    const storage = memoryStorage()

    await storage.setItem('key', 'value')
    expect(await storage.getItem('key')).toBe('value')
  })

  const storageTypes = { unstorage: createStorage(), memoryStorage: memoryStorage() }

  it.each(Object.entries(storageTypes))('createAsyncStorage works with %s', async (name, storage) => {
    const asyncStorage = createAsyncStorage(storage)

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
    await unifont.resolveFont({ fontFamily: 'Poppins', provider: 'custom-storage' })
    expect(customStorage.getItem).toHaveBeenCalledWith('key')
    expect(customStorage.setItem).toHaveBeenCalledWith('key', expect.objectContaining({ data: 'value' }))
    expect(customStorage.setItem).toHaveBeenCalledWith('another-key', expect.objectContaining({ data: 'value' }))
  })
})
