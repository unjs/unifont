import { hash } from 'ohash'
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

interface CachedStorageOptions {
  /**
   * Array of values used to create an isolated cache key namespace.
   * Each element is stringified or hashed to form a unique cache key prefix.
   *
   * @example
   * ```ts
   * const providerName = 'google-fonts'
   * const providerOptions = { apiKey: 'xxx', subset: 'latin' }
   * createCachedAsyncStorage(storage, {
   *   namespace: [providerName, providerOptions]
   * })
   * // Results in cache keys like: 'google-fonts:hash_of_options:actual_key'
   * ```
   */
  namespace?: any[]
}

export function createCachedAsyncStorage(storage: Storage, options: CachedStorageOptions = {}) {
  function resolveKey(key: string): string {
    if (!options?.namespace || options.namespace.length === 0) {
      return key
    }

    return `${createCacheKey(...options.namespace)}:${key}`
  }

  return {
    async getItem<T = unknown>(key: string, init?: () => T | Promise<T>) {
      const resolvedKey = resolveKey(key)
      const now = Date.now()
      const res = await storage.getItem(resolvedKey)
      if (res && res.expires > now && res.version === version) {
        return res.data
      }
      if (!init) {
        return null
      }
      const data = await init()
      await storage.setItem(resolvedKey, { expires: now + ONE_WEEK, version, data })
      return data
    },
    async setItem(key: string, data: unknown) {
      await storage.setItem(resolveKey(key), { expires: Date.now() + ONE_WEEK, version, data })
    },
  }
}

function createCacheKey(...fragments: any[]): string {
  const parts = fragments.map((f) => {
    // Don't hash string values to maintain readability.
    const part = typeof f === 'string' ? f : hash(f)
    return sanitize(part)
  })

  return parts.join(':')
}

function sanitize(input: string): string {
  if (!input)
    return ''

  return input.replace(/[^\w.-]/g, '_')
}
