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

const MOCK_CAL_SANS_CSS = `
@font-face {
  font-family: "Cal Sans";
  font-style: normal;
  font-display: swap;
  font-weight: 600;
  src: url("./fonts/webfonts/CalSans-SemiBold.woff2") format("woff2"),
    url("./fonts/webfonts/CalSans-SemiBold.woff") format("woff");
}
`

const MOCK_INTER_VARIABLE_CSS = `
/* inter-latin-wght-normal */
@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url(./files/inter-latin-wght-normal.woff2) format('woff2-variations');
  unicode-range: U+0000-00FF;
}
`

const MOCK_PACKAGE_JSON = JSON.stringify({
  dependencies: {
    '@fontsource/roboto': '^5.0.0',
    'cal-sans': '^1.0.0',
    '@fontsource-variable/inter': '^5.0.0',
  },
  devDependencies: {
    '@fontsource/geist-sans': '^5.0.0',
  },
})

const MOCK_PKG_VERSION_JSON = JSON.stringify({ version: '5.2.9' })

describe('npm', () => {
  describe('cdn resolution', () => {
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

    it('resolves @fontsource-variable packages for variable font families', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource-variable\/inter/, () =>
        new Response(MOCK_INTER_VARIABLE_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Inter Variable')

      expect(fonts.length).toBeGreaterThan(0)

      restoreFetch()
    })
  })

  describe('local resolution', () => {
    it('resolves fonts from local node_modules', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource/roboto/index.css')
          return MOCK_ROBOTO_CSS
        if (path === './node_modules/@fontsource/roboto/package.json')
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBeGreaterThan(0)
      // Should use pinned version from local package.json in CDN URLs
      for (const font of fonts) {
        for (const src of font.src) {
          if ('url' in src) {
            expect(src.url).toContain('@fontsource/roboto@5.2.9')
          }
        }
      }
      // Should have read the local CSS file
      expect(readFile).toHaveBeenCalledWith('./node_modules/@fontsource/roboto/index.css')
    })

    it('falls back to CDN when local read fails', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        // Local CSS read fails
        return null
      })

      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBeGreaterThan(0)
      // Should have CDN URLs with 'latest' version
      for (const font of fonts) {
        for (const src of font.src) {
          if ('url' in src) {
            expect(src.url).toContain('@fontsource/roboto@latest')
          }
        }
      }

      restoreFetch()
    })

    it('auto-detects cal-sans from package.json', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        if (path === './node_modules/cal-sans/package.json')
          return JSON.stringify({ version: '1.0.1' })
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Cal Sans')

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toHaveProperty('url', expect.stringContaining('cal-sans@1.0.1'))
    })

    it('auto-detects @fontsource-variable packages', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource-variable/inter/index.css')
          return MOCK_INTER_VARIABLE_CSS
        if (path === './node_modules/@fontsource-variable/inter/package.json')
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Inter Variable')

      expect(fonts.length).toBeGreaterThan(0)
    })

    it('supports custom root directory', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/@fontsource/roboto/index.css')
          return MOCK_ROBOTO_CSS
        if (path === '/my/project/node_modules/@fontsource/roboto/package.json')
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBeGreaterThan(0)
      expect(readFile).toHaveBeenCalledWith('/my/project/node_modules/@fontsource/roboto/index.css')
    })

    it('handles readFile that throws errors', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        throw new Error('Permission denied')
      })

      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto')

      // Should fall back to CDN
      expect(fonts.length).toBeGreaterThan(0)

      restoreFetch()
    })

    it('uses latest version when local package.json version is unavailable', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource/roboto/index.css')
          return MOCK_ROBOTO_CSS
        if (path === './node_modules/@fontsource/roboto/package.json')
          return null
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBeGreaterThan(0)
      for (const font of fonts) {
        for (const src of font.src) {
          if ('url' in src) {
            expect(src.url).toContain('@fontsource/roboto@latest')
          }
        }
      }
    })

    it('does not fall back to CDN when remote is false', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        // Local CSS not found
        return null
      })

      // Mock CDN to track if it's called
      const cdnCalled = vi.fn()
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () => {
        cdnCalled()
        return new Response(MOCK_ROBOTO_CSS)
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts).toStrictEqual([])
      expect(cdnCalled).not.toHaveBeenCalled()

      restoreFetch()
    })
  })

  describe('listFonts', () => {
    it('returns undefined when no readFile is provided', async () => {
      const restoreFetch = mockFetchReturn(/./, () => new Response(''))

      const unifont = await createUnifont([providers.npm()])
      const names = await unifont.listFonts()

      expect(names).toBeUndefined()

      restoreFetch()
    })

    it('lists auto-detected fonts from package.json', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const names = await unifont.listFonts()

      expect(names).toBeDefined()
      expect(names).toContain('Roboto')
      expect(names).toContain('Cal Sans')
      expect(names).toContain('Inter Variable')
      expect(names).toContain('Geist Sans')
    })

    it('returns undefined when package.json has no font dependencies', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return JSON.stringify({ dependencies: { vue: '^3.0.0' } })
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const names = await unifont.listFonts()

      expect(names).toBeUndefined()
    })

    it('lazily reads package.json on first call', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        return null
      })

      // Provider init should NOT read package.json
      const unifont = await createUnifont([providers.npm({ readFile })])
      expect(readFile).not.toHaveBeenCalledWith('./package.json')

      // First listFonts call triggers the read
      await unifont.listFonts()
      expect(readFile).toHaveBeenCalledWith('./package.json')
    })

    it('re-scans package.json when content changes', async () => {
      let currentPkgJson = JSON.stringify({
        dependencies: { '@fontsource/roboto': '^5.0.0' },
      })

      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return currentPkgJson
        if (path.endsWith('/index.css'))
          return MOCK_ROBOTO_CSS
        if (path.endsWith('/package.json') && path.includes('node_modules'))
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])

      const names1 = await unifont.listFonts()
      expect(names1).toStrictEqual(['Roboto'])

      // Simulate adding a new dependency
      currentPkgJson = JSON.stringify({
        dependencies: {
          '@fontsource/roboto': '^5.0.0',
          'cal-sans': '^1.0.0',
        },
      })

      const names2 = await unifont.listFonts()
      expect(names2).toContain('Roboto')
      expect(names2).toContain('Cal Sans')
    })
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
