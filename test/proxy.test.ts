import { Agent, EnvHttpProxyAgent, getGlobalDispatcher, ProxyAgent, setGlobalDispatcher } from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function freshInstall(): Promise<() => Promise<void>> {
  vi.resetModules()
  const { installProxyDispatcher } = await import('../src/proxy')
  return installProxyDispatcher
}

describe('installProxyDispatcher', () => {
  const originalDispatcher = getGlobalDispatcher()
  const proxyEnvKeys = ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy'] as const
  const savedEnv: Partial<Record<typeof proxyEnvKeys[number], string | undefined>> = {}

  beforeEach(() => {
    for (const key of proxyEnvKeys) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of proxyEnvKeys) {
      if (savedEnv[key] === undefined)
        delete process.env[key]
      else
        process.env[key] = savedEnv[key]
    }
    setGlobalDispatcher(originalDispatcher)
  })

  it('does nothing when no proxy env var is set', async () => {
    const before = getGlobalDispatcher()
    const install = await freshInstall()
    await install()
    expect(getGlobalDispatcher()).toBe(before)
  })

  it('installs EnvHttpProxyAgent when HTTPS_PROXY is set', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:9999'
    const install = await freshInstall()
    await install()
    expect(getGlobalDispatcher()).toBeInstanceOf(EnvHttpProxyAgent)
  })

  it('honours lower-case https_proxy', async () => {
    process.env.https_proxy = 'http://127.0.0.1:9999'
    const install = await freshInstall()
    await install()
    expect(getGlobalDispatcher()).toBeInstanceOf(EnvHttpProxyAgent)
  })

  it('honours HTTP_PROXY when HTTPS_PROXY is unset', async () => {
    process.env.HTTP_PROXY = 'http://127.0.0.1:9999'
    const install = await freshInstall()
    await install()
    expect(getGlobalDispatcher()).toBeInstanceOf(EnvHttpProxyAgent)
  })

  it('does not trample a user-installed custom dispatcher', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:9999'
    const custom = new ProxyAgent('http://127.0.0.1:8888')
    setGlobalDispatcher(custom)
    const install = await freshInstall()
    await install()
    expect(getGlobalDispatcher()).toBe(custom)
    expect(getGlobalDispatcher()).not.toBeInstanceOf(EnvHttpProxyAgent)
  })

  it('is idempotent across repeated calls', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:9999'
    const install = await freshInstall()
    await install()
    const first = getGlobalDispatcher()
    await install()
    expect(getGlobalDispatcher()).toBe(first)
  })

  it('retries if env vars are not present on the first call', async () => {
    const install = await freshInstall()
    await install()
    expect(getGlobalDispatcher()).toBeInstanceOf(Agent)
    expect(getGlobalDispatcher()).not.toBeInstanceOf(EnvHttpProxyAgent)

    process.env.HTTPS_PROXY = 'http://127.0.0.1:9999'
    await install()
    expect(getGlobalDispatcher()).toBeInstanceOf(EnvHttpProxyAgent)
  })
})
