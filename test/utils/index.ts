import type { FontFaceData } from '../../src'
import { vi } from 'vitest'

// Quick and dirty way to pick into a new array, not needed if the test is un-necessary
export function pickUniqueBy<T, K>(arr: T[], by: (arg: T) => K): K[] {
  return [...arr.reduce((acc, fnt) => {
    const prop = by(fnt)
    if (!acc.has(prop))
      acc.add(prop)
    return acc
  }, new Set<K>())]
}

export function groupBy<T, K extends PropertyKey>(arr: T[], by: (arg: T) => K): Record<K, T[]> {
  return arr.reduce((acc, fnt) => {
    const prop = by(fnt)
    if (!acc[prop])
      acc[prop] = []
    acc[prop].push(fnt)
    return acc
  }, {} as Record<K, T[]>)
}

export function sanitizeFontSource(data: FontFaceData[]) {
  return data.map(d => ({
    ...d,
    src: d.src.map(s => ({
      ...s,
      url: 'url' in s ? s.url.replace(/^((https?:)?\/\/[^/]+)\/.*(\.[^.]+)?$/, '$1/font$3') : undefined,
    })),
  }))
}

type RemoteProviders = keyof typeof import('../../src/providers')
type OptimizationSupportedProviders = Extract<RemoteProviders, 'google' | 'googleicons'>

export function getOptimizerIdentityFromUrl(provider: OptimizationSupportedProviders, url: string) {
  if (provider === 'google' || provider === 'googleicons') {
    const params = new URL(url).searchParams

    // Google Fonts provides 3 params: kit, skey, v.
    // V changes frequently, but other 2 params are stable and suitable for identification.
    return {
      kit: params.get('kit') ?? '',
      skey: params.get('skey') ?? '',
    }
  }
  // TODO: add other providers when they support optimizing
}

export function mockFetchReturn(condition: RegExp, value: () => unknown) {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (...args) => {
    if (condition.test(args[0] as string)) {
      return value() as any
    }
    return originalFetch(...args)
  }

  return () => {
    globalThis.fetch = originalFetch
  }
}

export async function disable$fetchRetry() {
  vi.mock('../../src/fetch', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../src/fetch')>()
    return {
      $fetch: Object.assign(mod.mini$fetch, {
        create: (defaults?: any) => (url: string, options?: any) => mod.mini$fetch(url, {
          ...defaults,
          ...options,
          retries: 0, // Disable retries
        }),
      }),
    }
  })
}
