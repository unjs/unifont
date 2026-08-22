import { afterEach, describe, expect, it, vi } from 'vitest'

const HOSTED = 'https://proxy.unifont.dev'

/** Resolves `apiBase` as if `std-env` had detected the given environment. */
async function resolveIn(env: { hasWindow?: boolean, provider?: string }, apiBase?: string | false) {
  vi.resetModules()
  vi.doMock('std-env', () => ({ hasWindow: false, provider: '', ...env }))
  const { resolveAPIBase } = await import('../src/api-base')
  return resolveAPIBase(apiBase)
}

afterEach(() => {
  vi.doUnmock('std-env')
  vi.resetModules()
})

describe('default apiBase', () => {
  it('does not proxy on a server, where the provider APIs are reachable', async () => {
    await expect(resolveIn({})).resolves.toBeUndefined()
  })

  it('proxies in a browser', async () => {
    await expect(resolveIn({ hasWindow: true })).resolves.toBe(HOSTED)
  })

  it('proxies in a StackBlitz web container, whose node process is also bound by CORS', async () => {
    await expect(resolveIn({ provider: 'stackblitz' })).resolves.toBe(HOSTED)
  })

  it('does not proxy for providers that merely resemble a web container', async () => {
    await expect(resolveIn({ provider: 'codesandbox' })).resolves.toBeUndefined()
  })

  it('prefers an explicit apiBase over the hosted default', async () => {
    await expect(resolveIn({ hasWindow: true }, 'https://fonts.example.com')).resolves.toBe('https://fonts.example.com')
  })

  it('opts out of proxying entirely with `false`', async () => {
    await expect(resolveIn({ hasWindow: true, provider: 'stackblitz' }, false)).resolves.toBeUndefined()
  })

  it('routes an unconfigured browser instance through the hosted proxy', async () => {
    vi.resetModules()
    vi.doMock('std-env', () => ({ hasWindow: true, provider: '' }))

    const requests: string[] = []
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requests.push(String(input))
      return Promise.resolve(new Response('{}'))
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      const { createUnifont, providers } = await import('../src')
      await createUnifont([providers.bunny()])
    }
    finally {
      vi.unstubAllGlobals()
    }

    expect(requests).toEqual([`${HOSTED}/bunny/v1/list`])
  })
})
