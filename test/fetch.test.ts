import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRetries } from '../src/fetch'

describe('unifont', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error('Network Error')),
    )
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  afterAll(() => {
    globalThis.fetch = originalFetch
  })
  it('retries the request before giving up', async () => {
    const promise = fetchWithRetries('https://fonts.googleapis.com/css2?family=test', undefined, 2).catch(() => null)
    await vi.runAllTimersAsync()
    await promise
    // 1 initial attempt + 2 retries
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
    expect(globalThis.fetch).toHaveBeenLastCalledWith('https://fonts.googleapis.com/css2?family=test', undefined)
  })

  it.each([500, 503, 429])('retries a %i response', async (status) => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status, statusText: 'nope' })),
    )

    const promise = fetchWithRetries('https://example.com/font.css', undefined, 2).catch(() => null)
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe(null)
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })

  it.each([400, 404, 418])('does not retry a %i response', async (status) => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status, statusText: 'nope' })),
    )

    await expect(fetchWithRetries('https://example.com/font.css', undefined, 2))
      .rejects
      .toThrow(`Fetch error (status ${status})`)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('resolves an ok response without retrying', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response('ok', { status: 200 })))

    const response = await fetchWithRetries('https://example.com/font.css')

    expect(await response.text()).toBe('ok')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
