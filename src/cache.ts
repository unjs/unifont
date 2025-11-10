import { version } from '../package.json'

type Awaitable<T> = T | Promise<T>

type StorageValue = string | Record<string, unknown>
export interface Storage {
  getItem: (key: string) => Awaitable<any | null>
  setItem: <T extends StorageValue = StorageValue>(key: string, value: T) => Awaitable<void>
}

export function memoryStorage() {
  const cache = new Map<string, unknown>()
  return {
    getItem(key: string) {
      return cache.get(key)
    },
    setItem(key: string, value: StorageValue) {
      cache.set(key, value)
    },
  } satisfies Storage
}

const ONE_WEEK = 1000 * 60 * 60 * 24 * 7

export function createCachedAsyncStorage(storage: Storage) {
  return {
    async getItem<T = unknown>(key: string, init?: () => T | Promise<T>) {
      const now = Date.now()
      const res = await storage.getItem(key)
      if (res && res.expires > now && res.version === version) {
        return res.data
      }
      if (!init) {
        return null
      }
      const data = await init()
      await storage.setItem(key, { expires: now + ONE_WEEK, version, data })
      return data
    },
    async setItem(key: string, data: unknown) {
      await storage.setItem(key, { expires: Date.now() + ONE_WEEK, version, data })
    },
  }
}
