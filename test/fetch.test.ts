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
})
