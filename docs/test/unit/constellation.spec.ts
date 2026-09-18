import { afterEach, describe, expect, it, vi } from 'vitest'
import { recentStacks, stacksUsing } from '../../server/utils/constellation'

function captureRequest() {
  const calls: string[] = []
  vi.stubGlobal('fetch', (url: string) => {
    calls.push(url)
    return Promise.resolve(new Response(JSON.stringify({ total: 0, records: [], cursor: null }), {
      headers: { 'content-type': 'application/json' },
    }))
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('constellation queries', () => {
  it('should ask for stacks in any role of the collection', async () => {
    const calls = captureRequest()
    await stacksUsing('https://unifont.dev/fonts/Inter')

    const { searchParams } = new URL(calls[0]!)
    expect(searchParams.get('subject')).toBe('https://unifont.dev/fonts/Inter')
    expect(searchParams.get('source')).toBe('dev.unifont.stack:roles[].uri')
  })

  it('should enumerate the collection through the constant link every record carries', async () => {
    const calls = captureRequest()
    await recentStacks()

    const { searchParams } = new URL(calls[0]!)
    expect(searchParams.get('subject')).toBe('https://unifont.dev/stack')
    expect(searchParams.get('source')).toBe('dev.unifont.stack:app')
  })

  it('should cap the page size the index will accept', async () => {
    const calls = captureRequest()
    await stacksUsing('https://unifont.dev/fonts/Inter', 500)

    expect(new URL(calls[0]!).searchParams.get('limit')).toBe('100')
  })
})
