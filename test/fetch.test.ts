import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { $fetch, mini$fetch } from '../src/fetch'
import * as fetchModule from '../src/fetch'

describe('unifont', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error('Network Error')),
    )
    vi.spyOn(fetchModule, 'mini$fetch')
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
    expect(mini$fetch).toHaveBeenCalledTimes(3)
    expect(mini$fetch).toHaveBeenLastCalledWith('/css2', { ...options, retries: 0 })
  })
})
