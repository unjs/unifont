import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { $fetch } from '../src/fetch'

describe('unifont', () => {
  let mockedFetch: typeof globalThis.fetch
  const originalFetch = globalThis.fetch
  beforeEach(() => {
    mockedFetch = globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error('Network Error')),
    )
  })
  afterAll(() => {
    globalThis.fetch = originalFetch
  })
  it('does not mutate url', async () => {
    const options = {
      baseURL: 'https://fonts.googleapis.com',
      headers: { 'user-agent': 'my-user-agent' },
      query: {
        family: `test`,
      },
    }
    await $fetch('/css2', options).catch(() => null)
    expect(mockedFetch).toHaveBeenLastCalledWith('https://fonts.googleapis.com/css2?family=test', { ...options, retries: 0 })
  })
})
