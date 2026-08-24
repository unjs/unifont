import type { FontFaceData } from 'unifont'
import { describe, expect, it } from 'vitest'
import { absoluteUrl, faceUrls, toFontFaceCss } from '../../server/utils/css'

const remote: FontFaceData = {
  src: [{ url: 'https://cdn.example.com/a.woff2', format: 'woff2' }],
  weight: 400,
  style: 'normal',
  unicodeRange: ['U+0000-00FF', 'U+0131'],
  meta: { subset: 'latin' },
}

describe('toFontFaceCss', () => {
  it('should emit a font-face block with the family quoted', () => {
    const css = toFontFaceCss('Big Shoulders Display', [remote])
    expect(css).toContain('font-family: "Big Shoulders Display";')
    expect(css).toContain('url("https://cdn.example.com/a.woff2") format("woff2")')
  })

  it('should default font-display to swap', () => {
    expect(toFontFaceCss('A', [remote])).toContain('font-display: swap;')
    expect(toFontFaceCss('A', [{ ...remote, display: 'optional' }])).toContain('font-display: optional;')
  })

  it('should join a variable weight range with a space', () => {
    expect(toFontFaceCss('A', [{ ...remote, weight: [200, 800] }])).toContain('font-weight: 200 800;')
  })

  it('should label the block with the subset when the provider gave one', () => {
    expect(toFontFaceCss('A', [remote])).toContain('/* latin */')
    expect(toFontFaceCss('A', [{ ...remote, meta: undefined }])).not.toContain('/*')
  })

  it('should render local sources as local()', () => {
    const css = toFontFaceCss('A', [{ src: [{ name: 'Arial' }] }])
    expect(css).toContain('src: local("Arial");')
  })

  it('should omit descriptors the provider did not report', () => {
    const css = toFontFaceCss('A', [{ src: [{ url: 'https://example.com/a.woff2' }] }])
    expect(css).not.toContain('font-weight')
    expect(css).not.toContain('unicode-range')
  })

  it('should add a custom property for the stack when fallbacks are given', () => {
    const css = toFontFaceCss('Big Shoulders Display', [remote], { fallbacks: ['sans-serif'] })
    expect(css).toContain('--font-big-shoulders-display: "Big Shoulders Display", sans-serif;')
  })
})

describe('absoluteUrl', () => {
  it('should give protocol-relative urls an https scheme', () => {
    expect(absoluteUrl('//cdn.fontshare.com/wf/AAA.woff2')).toBe('https://cdn.fontshare.com/wf/AAA.woff2')
  })

  it('should leave absolute urls alone', () => {
    expect(absoluteUrl('https://fonts.gstatic.com/a.woff2')).toBe('https://fonts.gstatic.com/a.woff2')
    expect(absoluteUrl('file:///tmp/a.woff2')).toBe('file:///tmp/a.woff2')
  })
})

describe('faceUrls', () => {
  it('should collect remote urls and skip local sources', () => {
    expect(faceUrls([
      remote,
      { src: [{ name: 'Arial' }, { url: 'https://cdn.example.com/b.woff2' }] },
    ])).toEqual(['https://cdn.example.com/a.woff2', 'https://cdn.example.com/b.woff2'])
  })

  it('should absolutise protocol-relative urls so HEAD requests work', () => {
    expect(faceUrls([{ src: [{ url: '//cdn.fontshare.com/wf/AAA.woff2' }] }]))
      .toEqual(['https://cdn.fontshare.com/wf/AAA.woff2'])
  })
})
