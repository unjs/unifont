import type { ProviderFactory } from '../src/types'
import { describe, expect, it } from 'vitest'
import { createCacheKeyFactory } from '../src/cache-key'

type ExtractProviderOption<TP> = TP extends ProviderFactory<infer TO> ? TO : never

type GoogleProviderOption = ExtractProviderOption<typeof import('../src/providers/google').default>

describe('cache-key', () => {
  it('differs when provider options change', () => {
    const optA = { experimental: { glyphs: { Roboto: ['Hello'] } } } satisfies GoogleProviderOption
    const optB = { experimental: { glyphs: { Roboto: ['World'] } } } satisfies GoogleProviderOption
    const keyA = createCacheKeyFactory('google', optA)('data.json', ({ hash, join }) => join('Roboto', hash({ weights: ['400'], styles: ['normal'] })))
    const keyB = createCacheKeyFactory('google', optB)('data.json', ({ hash, join }) => join('Roboto', hash({ weights: ['400'], styles: ['normal'] })))

    expect(keyA).not.toBe(keyB)
  })

  it('differs across providers for identical labels/body', () => {
    const google = createCacheKeyFactory('google', {})
    const fs = createCacheKeyFactory('fontshare', {})

    const googleKey = google('data.json', () => 'body')
    const fsKey = fs('data.json', () => 'body')

    expect(googleKey).not.toBe(fsKey)
  })
})
