import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn } from '../utils'

// Disable $fetch retry logic
await vi.hoisted(async () => {
  const { disable$fetchRetry } = await import('../utils')
  await disable$fetchRetry()
})

// Minimal CSS fixture that matches real fontsource structure
const MOCK_ROBOTO_CSS = `
/* roboto-latin-400-normal */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url(./files/roboto-latin-400-normal.woff2) format('woff2'), url(./files/roboto-latin-400-normal.woff) format('woff');
  unicode-range: U+0000-00FF;
}

/* roboto-latin-400-italic */
@font-face {
  font-family: 'Roboto';
  font-style: italic;
  font-display: swap;
  font-weight: 400;
  src: url(./files/roboto-latin-400-italic.woff2) format('woff2'), url(./files/roboto-latin-400-italic.woff) format('woff');
  unicode-range: U+0000-00FF;
}

/* roboto-latin-700-normal */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-display: swap;
  font-weight: 700;
  src: url(./files/roboto-latin-700-normal.woff2) format('woff2'), url(./files/roboto-latin-700-normal.woff) format('woff');
  unicode-range: U+0000-00FF;
}
`

const MOCK_MULTI_FAMILY_CSS = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(./files/roboto-400.woff2) format('woff2');
}
@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: url(./files/open-sans-400.woff2) format('woff2');
}
`

describe('npm', () => {
  it('resolves fonts from CDN', async () => {
    const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
      new Response(MOCK_ROBOTO_CSS))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto')

    expect(fonts.length).toBeGreaterThan(0)

    // Verify URLs are absolute CDN URLs
    for (const font of fonts) {
      for (const src of font.src) {
        if ('url' in src) {
          expect(src.url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\//)
        }
      }
    }

    restoreFetch()
  })

  it('returns empty fonts for nonexistent package', async () => {
    const restoreFetch = mockFetchReturn(/@fontsource\/nonexistent/, () => {
      throw new Error('Not found')
    })

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Nonexistent Font')

    expect(fonts).toStrictEqual([])

    restoreFetch()
  })

  it('filters by family name', async () => {
    const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
      new Response(MOCK_MULTI_FAMILY_CSS))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto')

    // Should only include Roboto, not Open Sans
    expect(fonts.length).toBe(1)
    for (const font of fonts) {
      for (const src of font.src) {
        if ('url' in src) {
          expect(src.url).toContain('roboto')
        }
      }
    }

    restoreFetch()
  })

  it('supports custom CDN', async () => {
    const customCdn = 'https://unpkg.com'
    const restoreFetch = mockFetchReturn(/unpkg\.com/, () =>
      new Response(MOCK_ROBOTO_CSS))

    const unifont = await createUnifont([providers.npm({ cdn: customCdn })])
    const { fonts } = await unifont.resolveFont('Roboto')

    expect(fonts.length).toBeGreaterThan(0)
    for (const font of fonts) {
      for (const src of font.src) {
        if ('url' in src) {
          expect(src.url).toMatch(/^https:\/\/unpkg\.com\//)
        }
      }
    }

    restoreFetch()
  })

  it('supports custom package name', async () => {
    const restoreFetch = mockFetchReturn(/@custom\/my-font/, () =>
      new Response(MOCK_ROBOTO_CSS))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto', {
      options: { npm: { package: '@custom/my-font' } },
    })

    expect(fonts.length).toBeGreaterThan(0)

    restoreFetch()
  })

  it('supports custom version', async () => {
    const restoreFetch = mockFetchReturn(/5\.0\.0/, () =>
      new Response(MOCK_ROBOTO_CSS))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto', {
      options: { npm: { version: '5.0.0' } },
    })

    expect(fonts.length).toBeGreaterThan(0)

    restoreFetch()
  })

  it('supports custom CSS file', async () => {
    const restoreFetch = mockFetchReturn(/400\.css/, () =>
      new Response(MOCK_ROBOTO_CSS))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto', {
      options: { npm: { file: '400.css' } },
    })

    expect(fonts.length).toBeGreaterThan(0)

    restoreFetch()
  })

  it('handles protocol-relative URLs', async () => {
    const cssWithProtocolRelativeUrl = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(//cdn.example.com/fonts/roboto.woff2) format('woff2');
}
`
    const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
      new Response(cssWithProtocolRelativeUrl))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto')

    expect(fonts.length).toBe(1)
    // Protocol-relative URLs should be preserved as-is
    expect(fonts[0]!.src[0]).toHaveProperty('url', '//cdn.example.com/fonts/roboto.woff2')

    restoreFetch()
  })

  it('handles absolute http URLs', async () => {
    const cssWithAbsoluteUrl = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.example.com/roboto.woff2) format('woff2');
}
`
    const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
      new Response(cssWithAbsoluteUrl))

    const unifont = await createUnifont([providers.npm()])
    const { fonts } = await unifont.resolveFont('Roboto')

    expect(fonts.length).toBe(1)
    expect(fonts[0]!.src[0]).toHaveProperty('url', 'https://fonts.example.com/roboto.woff2')

    restoreFetch()
  })

  describe('formats', () => {
    it('woff2', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Roboto', {
        formats: ['woff2'],
      })

      // All 3 font-faces from CSS are returned, each filtered to woff2 only
      expect(fonts.length).toBe(3)
      for (const font of fonts) {
        expect(font.src.every(s => 'name' in s || s.format === 'woff2')).toBe(true)
      }

      restoreFetch()
    })

    it('woff', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Roboto', {
        formats: ['woff'],
      })

      expect(fonts.length).toBe(3)
      for (const font of fonts) {
        expect(font.src.every(s => 'name' in s || s.format === 'woff')).toBe(true)
      }

      restoreFetch()
    })

    it('several', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Roboto', {
        formats: ['woff2', 'woff'],
      })

      expect(fonts.length).toBe(3)
      // Each font face should have both formats
      for (const font of fonts) {
        const formats = font.src.filter(s => 'url' in s).map(s => ('format' in s ? s.format : undefined))
        expect(formats).toContain('woff2')
        expect(formats).toContain('woff')
      }

      restoreFetch()
    })

    it('unsupported format returns empty', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Roboto', {
        formats: ['eot'],
      })

      expect(fonts.length).toBe(0)

      restoreFetch()
    })
  })
})
