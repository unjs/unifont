type Awaitable<T> = T | Promise<T>

export interface Storage {
  getItem: (key: string) => Awaitable<any | null>
  setItem: (key: string, value: unknown) => Awaitable<void>
}

export function memoryStorage() {
  const cache = new Map<string, unknown>()
  return {
    getItem(key: string) {
      return cache.get(key)
    },
    setItem(key: string, value: unknown) {
      cache.set(key, value)
    },
  } satisfies Storage
}

export function createAsyncStorage(storage: Storage) {
  return {
    async getItem<T = unknown>(key: string, init?: () => Promise<T>) {
      return await storage.getItem(key) ?? (init ? await init() : null)
    },
    async setItem(key: string, value: unknown) {
      await storage.setItem(key, value)
    },
  }
}
