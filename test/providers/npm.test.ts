import { describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'
import { mockFetchReturn } from '../utils'

vi.mock('../../src/fetch', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/fetch')>()
  return {
    fetchWithRetries: (url: string, init?: RequestInit) => mod.fetchWithRetries(url, init, 0),
  }
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

function mockWeightCss(weight: string, style: 'normal' | 'italic') {
  return `
@font-face {
  font-family: 'Roboto';
  font-style: ${style};
  font-display: swap;
  font-weight: ${weight};
  src: url(./files/roboto-latin-${weight}-${style}.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
`
}

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

const MOCK_LOCAL_SOURCE_CSS = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: local('Roboto'), url(./files/roboto-latin-400-normal.woff2) format('woff2');
}
@font-face {
  font-family: 'Roboto';
  font-style: italic;
  font-weight: 400;
  src: local('Roboto Italic');
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

    it('handles getFontProperties correctly', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm()])
      const result = await unifont.getFontProperties('Roboto')
      expect(result?.provider).toBe('npm')
      expect(result?.styles).toEqual(expect.arrayContaining(['normal', 'italic']))
      expect(result?.weights).toEqual(expect.arrayContaining(['400', '700']))

      restoreFetch()
    })

    it('returns undefined from getFontProperties when the package cannot be fetched', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/nonexistent/, () => {
        throw new Error('Not found')
      })

      const unifont = await createUnifont([providers.npm()])
      expect(await unifont.getFontProperties('Nonexistent')).toEqual(undefined)

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

    it('preserves local() sources', async () => {
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_LOCAL_SOURCE_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBe(2)
      expect(fonts[0]!.src[0]).toStrictEqual({ name: 'Roboto' })
      expect(fonts[1]!.src).toStrictEqual([{ name: 'Roboto Italic' }])

      restoreFetch()
    })

    it('falls back to index.css when per-weight stylesheets are unavailable', async () => {
      const requested: string[] = []
      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, (input) => {
        const url = String(input)
        requested.push(url)
        if (!url.endsWith('/index.css'))
          throw new Error('Not found')
        return new Response(MOCK_ROBOTO_CSS)
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['700'], styles: ['normal'] })

      expect(fonts.length).toBe(3)
      expect(requested.map(url => url.split('/').pop())).toStrictEqual(['700.css', 'index.css'])

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

  describe('non-fontsource packages', () => {
    it('follows relative @import statements', async () => {
      const restoreFetch = mockFetchReturn(/computer-modern/, (url) => {
        if (String(url).endsWith('/index.css')) {
          return new Response(`@import "./cmu-serif.css";\n@import url('./cmu-bright.css');`)
        }
        if (String(url).endsWith('/cmu-serif.css')) {
          return new Response(`
            @font-face {
              font-family: "CMU Serif";
              font-weight: 500;
              src: url("./fonts/cmu-serif-500-roman.woff2") format("woff2");
            }
          `)
        }
        return new Response('', { status: 404 })
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('CMU Serif', {
        options: { npm: { package: 'computer-modern' } },
      })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/computer-modern@latest/fonts/cmu-serif-500-roman.woff2' })

      restoreFetch()
    })

    it('resolves urls relative to the stylesheet rather than the package root', async () => {
      const restoreFetch = mockFetchReturn(/@ibm\/plex-sans/, (url) => {
        if (String(url).endsWith('/css/ibm-plex-sans-all.css')) {
          return new Response(`
            @font-face {
              font-family: "IBM Plex Sans";
              font-weight: 700;
              src: url("../fonts/complete/woff2/IBMPlexSans-Bold.woff2") format("woff2");
            }
          `)
        }
        return new Response('', { status: 404 })
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('IBM Plex Sans')

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/@ibm/plex-sans@latest/fonts/complete/woff2/IBMPlexSans-Bold.woff2' })

      restoreFetch()
    })

    it('maps IBM Plex subset families onto their packages', async () => {
      const requested: string[] = []
      const restoreFetch = mockFetchReturn(/@ibm\/plex/, (url) => {
        requested.push(String(url))
        return new Response(`
          @font-face {
            font-family: "IBM Plex Sans JP";
            font-weight: 400;
            src: url("../fonts/complete/woff2/IBMPlexSansJP-Regular.woff2") format("woff2");
          }
        `)
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('IBM Plex Sans JP')

      expect(fonts.length).toBe(1)
      expect(requested[0]).toBe('https://cdn.jsdelivr.net/npm/@ibm/plex-sans-jp@latest/css/ibm-plex-sans-jp-all.css')

      restoreFetch()
    })

    it('falls back to the package.json `style` entry point', async () => {
      const restoreFetch = mockFetchReturn(/some-font-package/, (url) => {
        if (String(url).endsWith('/package.json')) {
          return new Response(JSON.stringify({ name: 'some-font-package', style: './dist/fonts.css' }))
        }
        if (String(url).endsWith('/dist/fonts.css')) {
          return new Response(`
            @font-face {
              font-family: "Some Font";
              font-weight: 400;
              src: url("./files/some-font.woff2") format("woff2");
            }
          `)
        }
        return new Response('', { status: 404 })
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Some Font', {
        options: { npm: { package: 'some-font-package' } },
      })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/some-font-package@latest/dist/files/some-font.woff2' })

      restoreFetch()
    })

    it('reads the `style` entry point from a locally installed package', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './node_modules/local-style/package.json')
          return JSON.stringify({ version: '2.0.0', style: 'dist/fonts.css' })
        if (path === './node_modules/local-style/dist/fonts.css') {
          return `
            @font-face {
              font-family: "Local Style";
              src: url("./local-style.woff2") format("woff2");
            }
          `
        }
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, exists: async () => true })])
      const { fonts } = await unifont.resolveFont('Local Style', {
        options: { npm: { package: 'local-style' } },
      })

      expect(fonts[0]!.src[0]).toMatchObject({ url: expect.stringContaining('local-style/dist/local-style.woff2') })
    })

    it('falls back to the package.json `main` entry point when it is a stylesheet', async () => {
      const restoreFetch = mockFetchReturn(/main-css-package/, (url) => {
        if (String(url).endsWith('/package.json')) {
          return new Response(JSON.stringify({ name: 'main-css-package', main: 'main-font.css' }))
        }
        if (String(url).endsWith('/main-font.css')) {
          return new Response(`
            @font-face {
              font-family: "Main Font";
              font-weight: 400;
              src: url("./files/main-font.woff2") format("woff2");
            }
          `)
        }
        return new Response('', { status: 404 })
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Main Font', {
        options: { npm: { package: 'main-css-package' } },
      })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/main-css-package@latest/files/main-font.woff2' })

      restoreFetch()
    })

    it('prefers the `style` entry point over a stylesheet `main`', async () => {
      const restoreFetch = mockFetchReturn(/both-fields-package/, (url) => {
        if (String(url).endsWith('/package.json')) {
          return new Response(JSON.stringify({ name: 'both-fields-package', style: 'style.css', main: 'main.css' }))
        }
        if (String(url).endsWith('/style.css') || String(url).endsWith('/main.css')) {
          const file = String(url).endsWith('/style.css') ? 'style' : 'main'
          return new Response(`
            @font-face {
              font-family: "Both Fields";
              font-weight: 400;
              src: url("./files/${file}.woff2") format("woff2");
            }
          `)
        }
        return new Response('', { status: 404 })
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Both Fields', {
        options: { npm: { package: 'both-fields-package' } },
      })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/both-fields-package@latest/files/style.woff2' })

      restoreFetch()
    })

    it('resolves nothing when the package declares only a JavaScript entry point', async () => {
      const requested: string[] = []
      const restoreFetch = mockFetchReturn(/styleless/, (url) => {
        requested.push(String(url))
        if (String(url).endsWith('/package.json')) {
          return new Response(JSON.stringify({ name: 'styleless', main: 'dist/index.js' }))
        }
        return new Response('', { status: 404 })
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Styleless', {
        options: { npm: { package: 'styleless' } },
      })

      expect(fonts).toStrictEqual([])
      expect(requested.some(url => url.endsWith('/dist/index.js'))).toBe(false)

      restoreFetch()
    })

    it('accepts a single mismatched family when the file is given explicitly', async () => {
      const restoreFetch = mockFetchReturn(/fontawesome-free/, () =>
        new Response(`
          @font-face {
            font-family: "Font Awesome 7 Brands";
            font-weight: 400;
            src: url("../webfonts/fa-brands-400.woff2") format("woff2");
          }
        `))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Font Awesome', {
        options: { npm: { package: '@fortawesome/fontawesome-free', file: 'css/brands.css' } },
      })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@latest/webfonts/fa-brands-400.woff2' })

      restoreFetch()
    })

    it('ignores external imports and stops following after a few levels', async () => {
      const requested: string[] = []
      const restoreFetch = mockFetchReturn(/deep-imports|fonts\.example\.com/, (url) => {
        requested.push(String(url))
        const depth = Number(String(url).match(/level-(\d)\.css/)?.[1] ?? 0)
        return new Response(`
          @import "https://fonts.example.com/external.css";
          @import "./level-${depth + 1}.css";
          @font-face {
            font-family: "Deep";
            font-weight: ${depth + 1}00;
            src: url("./deep-${depth}.woff2") format("woff2");
          }
        `)
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Deep', {
        options: { npm: { package: 'deep-imports' } },
        weights: ['100', '200', '300', '400', '500'],
      })

      const urls = requested.map(url => new URL(url))

      expect(fonts).toHaveLength(4)
      expect(new Set(urls.map(url => url.host))).toStrictEqual(new Set(['cdn.jsdelivr.net']))
      expect(urls.some(url => url.pathname.endsWith('/level-4.css'))).toBe(false)

      restoreFetch()
    })

    it('loads each imported stylesheet once', async () => {
      const requested: string[] = []
      const restoreFetch = mockFetchReturn(/cyclic-imports/, (url) => {
        requested.push(String(url))
        if (String(url).endsWith('/index.css')) {
          return new Response('@import "./shared.css";@import "./shared.css";')
        }
        return new Response(`
          @import "./index.css";
          @font-face {
            font-family: "Shared";
            src: url("./shared.woff2") format("woff2");
          }
        `)
      })

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Shared', {
        options: { npm: { package: 'cyclic-imports' } },
      })

      expect(fonts.length).toBe(1)
      expect(requested).toHaveLength(2)

      restoreFetch()
    })

    it('does not accept mismatched families when the stylesheet declares several', async () => {
      const restoreFetch = mockFetchReturn(/multi-family/, () =>
        new Response(MOCK_MULTI_FAMILY_CSS))

      const unifont = await createUnifont([providers.npm()])
      const { fonts } = await unifont.resolveFont('Nonexistent', {
        options: { npm: { package: 'multi-family', file: 'all.css' } },
      })

      expect(fonts.length).toBe(0)

      restoreFetch()
    })

    it('caches families that share a slug separately', async () => {
      const restoreFetch = mockFetchReturn(/roboto-mono/, () =>
        new Response(`
          @font-face {
            font-family: 'Roboto Mono';
            font-weight: 400;
            src: url(./files/roboto-mono-400.woff2) format('woff2');
          }
        `))

      const unifont = await createUnifont([providers.npm()])
      const spaced = await unifont.resolveFont('Roboto Mono')
      const hyphenated = await unifont.resolveFont('Roboto-Mono')

      expect(spaced.fonts).toHaveLength(1)
      expect(hyphenated.fonts).toHaveLength(0)

      restoreFetch()
    })

    it('caches per family rather than per package', async () => {
      const restoreFetch = mockFetchReturn(/two-families/, () =>
        new Response(MOCK_MULTI_FAMILY_CSS))

      const unifont = await createUnifont([providers.npm()])
      const roboto = await unifont.resolveFont('Roboto', { options: { npm: { package: 'two-families' } } })
      const openSans = await unifont.resolveFont('Open Sans', { options: { npm: { package: 'two-families' } } })

      expect(roboto.fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/two-families@latest/files/roboto-400.woff2' })
      expect(openSans.fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/two-families@latest/files/open-sans-400.woff2' })

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

    it('resolves getFontProperties from local node_modules', async () => {
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
      const result = await unifont.getFontProperties('Roboto')
      expect(result?.provider).toBe('npm')
      expect(result?.styles).toEqual(expect.arrayContaining(['normal', 'italic']))
      expect(result?.weights).toEqual(expect.arrayContaining(['400', '700']))
      expect(readFile).toHaveBeenCalledWith('./node_modules/@fontsource/roboto/index.css')
    })

    it('resolves getFontProperties for a package served entirely from index.css', async () => {
      const css = `
        @font-face {
          font-family: 'Inter Variable';
          font-style: normal;
          font-weight: 100 900;
          src: url(./files/inter-latin-wght-normal.woff2) format('woff2-variations');
        }
        @font-face {
          font-family: 'Inter Variable';
          src: url(./files/inter-latin-wght-italic.woff2) format('woff2-variations');
        }
      `

      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource-variable/inter/index.css')
          return css
        if (path === './node_modules/@fontsource-variable/inter/package.json')
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const result = await unifont.getFontProperties('Inter Variable')

      expect(result?.provider).toBe('npm')
      expect(result?.weights).toEqual(['100 900'])
      expect(result?.styles).toEqual(['normal'])
    })

    it('returns undefined from getFontProperties when local resolution fails and remote is disabled', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])
      expect(await unifont.getFontProperties('Roboto')).toEqual(undefined)
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

    it('ignores trailing slashes in the root directory', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/@fontsource/roboto/index.css')
          return MOCK_ROBOTO_CSS
        if (path === '/my/project/node_modules/@fontsource/roboto/package.json')
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, root: '/my/project/' })])
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

    it('resolves per-weight and per-style stylesheets', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource/roboto/package.json')
          return MOCK_PKG_VERSION_JSON
        const match = /\/(\d+)(-italic)?\.css$/.exec(path)
        if (match)
          return mockWeightCss(match[1]!, match[2] ? 'italic' : 'normal')
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400', '700'] })

      expect(fonts.map(f => `${f.weight}-${f.style}`).sort()).toStrictEqual([
        '400-italic',
        '400-normal',
        '700-italic',
        '700-normal',
      ])
      expect(readFile).not.toHaveBeenCalledWith('./node_modules/@fontsource/roboto/index.css')
    })

    it('expands weight ranges into per-weight stylesheets', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource/roboto/package.json')
          return MOCK_PKG_VERSION_JSON
        const match = /\/(\d+)\.css$/.exec(path)
        if (match)
          return mockWeightCss(match[1]!, 'normal')
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400 700'], styles: ['normal'] })

      expect(fonts.map(f => f.weight)).toStrictEqual([400, 500, 600, 700])
    })

    it('falls back to index.css when no styles are requested', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource/roboto/index.css')
          return MOCK_ROBOTO_CSS
        if (path.includes('/node_modules/@fontsource/roboto/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'], styles: [] })

      expect(fonts.length).toBe(3)
      expect(readFile).toHaveBeenCalledWith('./node_modules/@fontsource/roboto/index.css')
    })

    it('uses latest version when local package.json has no version', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource/roboto/400.css')
          return MOCK_ROBOTO_CSS
        if (path === './node_modules/@fontsource/roboto/package.json')
          return JSON.stringify({ name: '@fontsource/roboto' })
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'], styles: ['normal'] })

      expect(fonts[0]!.src[0]).toHaveProperty('url', expect.stringContaining('@fontsource/roboto@latest'))
    })

    it('falls back to index.css when per-weight stylesheets are missing', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        if (path.includes('/node_modules/cal-sans/fonts/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'] })

      expect(fonts.length).toBe(1)
    })

    it('uses index.css for variable packages', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === './node_modules/@fontsource-variable/inter/index.css')
          return MOCK_INTER_VARIABLE_CSS
        if (path.includes('/node_modules/@fontsource-variable/inter/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])
      const { fonts } = await unifont.resolveFont('Inter Variable', { weights: ['100 900'] })

      expect(fonts.length).toBe(1)
      expect(readFile).toHaveBeenCalledWith('./node_modules/@fontsource-variable/inter/index.css')
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

  describe('resolve', () => {
    it('uses a custom resolver in preference to root', async () => {
      const resolve = vi.fn((id: string) => `/pnpm/store/${id}`)
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/pnpm/store/@fontsource/roboto/index.css')
          return MOCK_ROBOTO_CSS
        if (path === '/pnpm/store/@fontsource/roboto/package.json')
          return MOCK_PKG_VERSION_JSON
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, resolve, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBeGreaterThan(0)
      expect(resolve).toHaveBeenCalledWith('@fontsource/roboto/index.css')
      expect(readFile).not.toHaveBeenCalledWith('/my/project/node_modules/@fontsource/roboto/index.css')
      for (const font of fonts) {
        for (const src of font.src) {
          if ('url' in src) {
            expect(src.url).toContain('@fontsource/roboto@5.2.9')
          }
        }
      }
    })

    it('emits file:// URLs anchored on the resolved package directory', async () => {
      const resolve = vi.fn((id: string) => `/pnpm/store/${id}`)
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/pnpm/store/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        if (path.startsWith('/pnpm/store/cal-sans/fonts/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, resolve, remote: false })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'], formats: ['woff2'] })

      expect(fonts[0]!.src).toStrictEqual([
        { url: 'file:///pnpm/store/cal-sans/fonts/webfonts/CalSans-SemiBold.woff2', format: 'woff2' },
      ])
    })

    it('follows @import statements and anchors file:// URLs on the importing stylesheet', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/local-imports/index.css')
          return '@import "./css/serif.css";'
        if (path === '/local-imports/css/serif.css') {
          return `
            @font-face {
              font-family: "Local Serif";
              font-weight: 400;
              src: url("../fonts/local-serif.woff2") format("woff2");
            }
          `
        }
        if (path === '/local-imports/fonts/local-serif.woff2')
          return 'binary'
        return null
      })
      const exists = vi.fn(async (path: string) => path.endsWith('/local-imports/fonts/local-serif.woff2'))

      const unifont = await createUnifont([providers.npm({ readFile, exists, remote: false, resolve: id => `/${id}` })])
      const { fonts } = await unifont.resolveFont('Local Serif', {
        options: { npm: { package: 'local-imports' } },
        formats: ['woff2'],
      })

      expect(fonts[0]!.src).toStrictEqual([
        { url: 'file:///local-imports/fonts/local-serif.woff2', format: 'woff2' },
      ])
    })

    it('accepts a `file` written with a leading `./`', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './node_modules/relative-file/package.json')
          return JSON.stringify({ version: '3.0.0' })
        if (path === './node_modules/relative-file/css/fonts.css') {
          return `
            @font-face {
              font-family: "Relative";
              src: url("../fonts/relative.woff2") format("woff2");
            }
          `
        }
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])
      const { fonts } = await unifont.resolveFont('Relative', {
        options: { npm: { package: 'relative-file', file: './css/fonts.css' } },
      })

      expect(fonts[0]!.src[0]).toMatchObject({ url: 'https://cdn.jsdelivr.net/npm/relative-file@3.0.0/fonts/relative.woff2' })
    })

    it('anchors urls on the resolved path when the resolver does not preserve the specifier', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/aliased/cal-sans.css')
          return MOCK_CAL_SANS_CSS
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, resolve: () => '/aliased/cal-sans.css' })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'], formats: ['woff2'] })

      expect(fonts[0]!.src).toStrictEqual([
        { url: 'https://cdn.jsdelivr.net/npm/cal-sans@latest/fonts/webfonts/CalSans-SemiBold.woff2', format: 'woff2' },
      ])
    })

    it('falls back to the CDN when resolution fails', async () => {
      const resolve = vi.fn(() => {
        const error = new Error('Cannot find module') as Error & { code: string }
        error.code = 'ERR_MODULE_NOT_FOUND'
        throw error
      })
      const readFile = vi.fn(async () => null)

      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm({ readFile, resolve })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBeGreaterThan(0)
      expect(readFile).not.toHaveBeenCalledWith(expect.stringContaining('roboto/index.css'))

      restoreFetch()
    })

    it('resolves nothing and makes no request when resolution fails with remote: false', async () => {
      const resolve = vi.fn(() => null)
      const readFile = vi.fn(async () => null)

      const cdnCalled = vi.fn()
      const restoreFetch = mockFetchReturn(/./, () => {
        cdnCalled()
        return new Response(MOCK_ROBOTO_CSS)
      })

      const unifont = await createUnifont([providers.npm({ readFile, resolve, remote: false })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts).toStrictEqual([])
      expect(cdnCalled).not.toHaveBeenCalled()

      restoreFetch()
    })

    it('resolves installed packages via import.meta.resolve by default', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path.endsWith('/css-tree/package.json'))
          return MOCK_ROBOTO_CSS
        if (path.includes('/css-tree/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])
      const { fonts } = await unifont.resolveFont('Roboto', {
        options: { npm: { package: 'css-tree', file: 'package.json' } },
      })

      expect(fonts.length).toBe(3)
      expect(readFile).toHaveBeenCalledWith(expect.stringContaining('/node_modules/css-tree/package.json'))
      expect(readFile).not.toHaveBeenCalledWith('./node_modules/css-tree/package.json')
    })

    it('anchors font URLs on the parent directory when the resolved path is aliased', async () => {
      const resolve = vi.fn(() => '/aliased/roboto.css')
      const readFile = vi.fn(async (path: string) => {
        if (path === '/aliased/roboto.css')
          return MOCK_ROBOTO_CSS
        if (path.startsWith('/aliased/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, resolve, remote: false })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'], styles: ['normal'], formats: ['woff2'] })

      expect(fonts[0]!.src[0]).toHaveProperty('url', 'file:///aliased/files/roboto-latin-400-normal.woff2')
    })

    it('falls back to the CDN when the resolved stylesheet has no matching family', async () => {
      const resolve = vi.fn((id: string) => `/elsewhere/${id}`)
      const readFile = vi.fn(async (path: string) => {
        if (path.startsWith('/elsewhere/@fontsource/roboto/'))
          return MOCK_MULTI_FAMILY_CSS.replace(/'Roboto'/, '"Other"')
        return null
      })

      const restoreFetch = mockFetchReturn(/@fontsource\/roboto/, () =>
        new Response(MOCK_ROBOTO_CSS))

      const unifont = await createUnifont([providers.npm({ readFile, resolve })])
      const { fonts } = await unifont.resolveFont('Roboto')

      expect(fonts.length).toBe(3)
      for (const font of fonts) {
        for (const src of font.src) {
          if ('url' in src) {
            expect(src.url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\//)
          }
        }
      }

      restoreFetch()
    })

    it('supports asynchronous resolvers', async () => {
      const resolve = vi.fn(async (id: string) => `/elsewhere/${id}`)
      const readFile = vi.fn(async (path: string) => {
        if (path === '/elsewhere/@fontsource/roboto/400.css')
          return MOCK_ROBOTO_CSS
        if (path.startsWith('/elsewhere/@fontsource/roboto/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, resolve, remote: false })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'], styles: ['normal'], formats: ['woff2'] })

      expect(fonts.length).toBe(3)
      expect(fonts[0]!.src[0]).toHaveProperty('url', 'file:///elsewhere/@fontsource/roboto/files/roboto-latin-400-normal.woff2')
    })
  })

  describe('remote: false', () => {
    it('emits file:// URLs for locally installed font files', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        if (path.startsWith('/my/project/node_modules/cal-sans/fonts/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'], formats: ['woff2', 'woff'] })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.src).toStrictEqual([
        { url: 'file:///my/project/node_modules/cal-sans/fonts/webfonts/CalSans-SemiBold.woff2', format: 'woff2' },
        { url: 'file:///my/project/node_modules/cal-sans/fonts/webfonts/CalSans-SemiBold.woff', format: 'woff' },
      ])
    })

    it('warns and drops sources whose files are missing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'] })

      expect(fonts).toStrictEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('CalSans-SemiBold.woff2'))

      warn.mockRestore()
    })

    it('preserves data and protocol-relative URLs', async () => {
      const cssWithInlineSources = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(data:font/woff2;base64,AAA) format('woff2'), url(//cdn.example.com/roboto.woff2) format('woff2');
}
`
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/@fontsource/roboto/400.css')
          return cssWithInlineSources
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'], styles: ['normal'] })

      expect(fonts[0]!.src).toStrictEqual([
        { url: 'data:font/woff2;base64,AAA', format: 'woff2' },
        { url: '//cdn.example.com/roboto.woff2', format: 'woff2' },
      ])
    })

    it('keeps local() sources and drops faces left without a URL', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/@fontsource/roboto/400.css')
          return MOCK_LOCAL_SOURCE_CSS
        if (path.includes('/node_modules/@fontsource/roboto/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'] })

      expect(fonts.length).toBe(1)
      expect(fonts[0]!.style).toBe('normal')
      expect(fonts[0]!.src).toStrictEqual([
        { name: 'Roboto' },
        { url: 'file:///my/project/node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2', format: 'woff2' },
      ])
    })

    it('drops sources when the font file cannot be read', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        throw new Error('Permission denied')
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'] })

      expect(fonts).toStrictEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('CalSans-SemiBold.woff2'))

      warn.mockRestore()
    })

    it('strips query strings and fragments before resolving font files', async () => {
      const cssWithQuery = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(./files/roboto-latin-400-normal.woff2?v=1) format('woff2'), url(./files/roboto-latin-400-normal.woff#iefix) format('woff');
}
`
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/@fontsource/roboto/400.css')
          return cssWithQuery
        if (path.startsWith('/my/project/node_modules/@fontsource/roboto/files/'))
          return 'binary'
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'], formats: ['woff2', 'woff'] })

      expect(fonts[0]!.src).toStrictEqual([
        { url: 'file:///my/project/node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2', format: 'woff2' },
        { url: 'file:///my/project/node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff', format: 'woff' },
      ])
    })

    it('uses `exists` rather than `readFile` to check for font files', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        return null
      })
      const exists = vi.fn(async (path: string) => path.startsWith('/my/project/node_modules/cal-sans/fonts/'))

      const unifont = await createUnifont([providers.npm({ readFile, exists, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'], formats: ['woff2'] })

      expect(fonts[0]!.src).toStrictEqual([
        { url: 'file:///my/project/node_modules/cal-sans/fonts/webfonts/CalSans-SemiBold.woff2', format: 'woff2' },
      ])
      expect(exists).toHaveBeenCalled()
      expect(readFile).not.toHaveBeenCalledWith(expect.stringContaining('/fonts/'))
    })

    it('drops sources when `exists` throws', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/cal-sans/index.css')
          return MOCK_CAL_SANS_CSS
        return null
      })
      const exists = vi.fn(async () => {
        throw new Error('Permission denied')
      })

      const unifont = await createUnifont([providers.npm({ readFile, exists, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Cal Sans', { weights: ['600'] })

      expect(fonts).toStrictEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('CalSans-SemiBold.woff2'))

      warn.mockRestore()
    })

    it('preserves absolute URLs', async () => {
      const cssWithAbsoluteUrl = `
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.example.com/roboto.woff2) format('woff2');
}
`
      const readFile = vi.fn(async (path: string) => {
        if (path === '/my/project/package.json')
          return MOCK_PACKAGE_JSON
        if (path === '/my/project/node_modules/@fontsource/roboto/400.css')
          return cssWithAbsoluteUrl
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile, remote: false, root: '/my/project' })])
      const { fonts } = await unifont.resolveFont('Roboto', { weights: ['400'] })

      expect(fonts[0]!.src[0]).toHaveProperty('url', 'https://fonts.example.com/roboto.woff2')
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

    it('names IBM Plex packages, uppercasing subset suffixes', async () => {
      const readFile = vi.fn(async (path: string) => {
        if (path === './package.json')
          return JSON.stringify({ dependencies: { '@ibm/plex-sans-condensed': '^1.0.0', '@ibm/plex-sans-jp': '^1.0.0' } })
        return null
      })

      const unifont = await createUnifont([providers.npm({ readFile })])

      expect(await unifont.listFonts()).toEqual(['IBM Plex Sans Condensed', 'IBM Plex Sans JP'])
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

    it('returns undefined when package.json cannot be read', async () => {
      const readFile = vi.fn(async () => {
        throw new Error('Permission denied')
      })

      const unifont = await createUnifont([providers.npm({ readFile })])

      expect(await unifont.listFonts()).toBeUndefined()
    })

    it('returns undefined when package.json is empty', async () => {
      const readFile = vi.fn(async () => '')

      const unifont = await createUnifont([providers.npm({ readFile })])

      expect(await unifont.listFonts()).toBeUndefined()
    })

    it('returns undefined when package.json is not valid JSON', async () => {
      const readFile = vi.fn(async (path: string) => path === './package.json' ? '{ not json' : null)

      const unifont = await createUnifont([providers.npm({ readFile })])

      expect(await unifont.listFonts()).toBeUndefined()
    })

    it('does not re-scan package.json when its content is unchanged', async () => {
      const readFile = vi.fn(async (path: string) => path === './package.json' ? MOCK_PACKAGE_JSON : null)

      const unifont = await createUnifont([providers.npm({ readFile, remote: false })])

      const names1 = await unifont.listFonts()
      const names2 = await unifont.listFonts()

      expect(names2).toStrictEqual(names1)
      expect(readFile.mock.calls.filter(([path]) => path === './package.json').length).toBe(2)
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
