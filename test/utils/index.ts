import type { FontFaceData } from '../../src'

// Quick and dirty way to pick into a new array, not needed if the test is un-necessary
export function pickUniqueBy<T, K>(arr: T[], by: (arg: T) => K): K[] {
  return [...arr.reduce((acc, fnt) => {
    const prop = by(fnt)
    if (!acc.has(prop))
      acc.add(prop)
    return acc
  }, new Set<K>())]
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
