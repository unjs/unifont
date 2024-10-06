import { createStorage } from 'unstorage'
import { describe, expect, it, vi } from 'vitest'

import { createAsyncStorage, memoryStorage } from '../src/cache'

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
})
