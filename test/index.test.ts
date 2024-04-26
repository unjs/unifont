import { describe, expect, it } from 'vitest'
import { welcome } from '../src'

describe('unifont', () => {
  it('works', () => {
    expect(welcome()).toMatchInlineSnapshot('"hello world"')
  })
})
