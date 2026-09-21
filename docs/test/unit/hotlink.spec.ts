import { describe, expect, it } from 'vitest'
import { isCrossSiteStylesheet } from '../../shared/hotlink'

describe('isCrossSiteStylesheet', () => {
  it('should refuse a stylesheet linked from another site', () => {
    expect(isCrossSiteStylesheet({ site: 'cross-site', dest: 'style' })).toBe(true)
  })

  it('should allow this site’s own pages', () => {
    expect(isCrossSiteStylesheet({ site: 'same-origin', dest: 'style' })).toBe(false)
    expect(isCrossSiteStylesheet({ site: 'same-site', dest: 'style' })).toBe(false)
  })

  it('should allow a script, a CI check or a curl, which send neither header', () => {
    expect(isCrossSiteStylesheet({ site: null, dest: null })).toBe(false)
  })

  it('should allow a cross-site request that is not a stylesheet', () => {
    expect(isCrossSiteStylesheet({ site: 'cross-site', dest: 'empty' })).toBe(false)
    expect(isCrossSiteStylesheet({ site: 'cross-site', dest: 'document' })).toBe(false)
  })
})
