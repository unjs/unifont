import { describe, expect, it } from 'vitest'
import { hash } from '../src/hash'

describe('hash', () => {
  it('should return a stable base36 string', () => {
    expect(hash({ a: 1 })).toMatch(/^[0-9a-z]+$/)
    expect(hash({ a: 1 })).toBe(hash({ a: 1 }))
  })

  it('should ignore object key order', () => {
    expect(hash({ a: 1, b: [2, 3] })).toBe(hash({ b: [2, 3], a: 1 }))
  })

  it('should respect array order', () => {
    expect(hash([1, 2])).not.toBe(hash([2, 1]))
  })

  it('should distinguish values of different types', () => {
    const values = [
      '1',
      1,
      1n,
      true,
      'true',
      null,
      'null',
      undefined,
      'undefined',
      Symbol('a'),
      // eslint-disable-next-line symbol-description
      Symbol(),
      () => 'a',
      () => 'b',
      [],
      {},
      new Date(0),
      new Date(1),
      /a/g,
      /a/,
      new Map([['a', 1]]),
      new Set(['a']),
      new URL('https://a.test'),
      new URL('https://b.test'),
    ]
    expect(new Set(values.map(hash)).size).toBe(values.length)
  })

  it('should distinguish a missing key from an undefined one', () => {
    expect(hash({ a: undefined })).not.toBe(hash({}))
  })

  it('should ignore Map and Set insertion order', () => {
    expect(hash(new Map([['a', 1], ['b', 2]]))).toBe(hash(new Map([['b', 2], ['a', 1]])))
    expect(hash(new Set(['a', 'b']))).toBe(hash(new Set(['b', 'a'])))
    expect(hash(new Map([['a', 1]]))).not.toBe(hash(new Map([['a', 2]])))
  })

  it('should handle circular references', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    const b: Record<string, unknown> = { name: 'b' }
    b.self = b
    expect(hash(a)).toBe(hash(a))
    expect(hash(a)).not.toBe(hash(b))
  })

  it('should not treat repeated non-circular references as circular', () => {
    const shared = { a: 1 }
    expect(hash([shared, shared])).toBe(hash([{ a: 1 }, { a: 1 }]))
  })
})
