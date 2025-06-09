import type { PathLike } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createUnifont, providers } from '../../src'

// Mock Node.js modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('node:path', () => ({
  resolve: vi.fn((...args) => args.join('/')),
  join: vi.fn((...args) => args.join('/')),
}))

vi.mock('node:process', () => ({
  cwd: vi.fn(() => '/mock/workspace'),
}))

vi.mock('pkg-types', () => ({
  readPackageJSON: vi.fn(),
}))

describe('npm provider', () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should detect various font packages from dependencies', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile } = await import('node:fs/promises')
    const { readPackageJSON } = await import('pkg-types')

    // Mock workspace package.json to include various font dependencies
    vi.mocked(readPackageJSON).mockResolvedValue({
      dependencies: {
        '@fontsource/poppins': '^5.0.0',
        '@fontsource/roboto': '^5.0.0',
        'cal-sans': '^1.0.0',
        'geist': '^1.0.0',
        'other-package': '^1.0.0', // Should be ignored
      },
      devDependencies: {
        inter: '^1.0.0',
      },
    } as any)

    // Mock package.json existence
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path.toString().includes('package.json'))
        return true
      return false
    })

    // Mock package.json content for each font package
    vi.mocked(readFile).mockImplementation(
      async (path: PathLike | FileHandle) => {
        if (path === 'node_modules/@fontsource/poppins/package.json') {
          return JSON.stringify({
            name: '@fontsource/poppins',
            fontName: 'Poppins',
          })
        }
        if (path === 'node_modules/@fontsource/roboto/package.json') {
          return JSON.stringify({
            name: '@fontsource/roboto',
            fontName: 'Roboto',
          })
        }
        if (path === 'node_modules/cal-sans/package.json') {
          return JSON.stringify({
            name: 'cal-sans',
            // No explicit fontName, should use package name mapping
          })
        }
        if (path === 'node_modules/geist/package.json') {
          return JSON.stringify({
            name: 'geist',
            fontFamily: 'Geist', // Using fontFamily instead of fontName
          })
        }
        if (path === 'node_modules/inter/package.json') {
          return JSON.stringify({
            name: 'inter',
            // No explicit font metadata, should use known fonts mapping
          })
        }
        return '{}'
      },
    )

    const unifont = await createUnifont([providers.npm()])

    const fonts = await unifont.listFonts()

    // Should have found all font packages
    expect(fonts).toContain('poppins')
    expect(fonts).toContain('roboto')
    expect(fonts).toContain('cal sans')
    expect(fonts).toContain('geist')
    expect(fonts).toContain('inter')

    // Should not contain non-font packages
    expect(fonts).not.toContain('other-package')

    // Should have read the workspace package.json
    expect(readPackageJSON).toHaveBeenCalledWith('/mock/workspace')
  })

  it('should resolve fonts from @fontsource packages', async () => {
    const { existsSync } = await import('node:fs')

    const { readFile } = await import('node:fs/promises')
    const { readPackageJSON } = await import('pkg-types')

    // Mock workspace package.json
    vi.mocked(readPackageJSON).mockResolvedValue({
      dependencies: {
        '@fontsource/poppins': '^5.0.0',
      },
      devDependencies: {},
    } as any)

    // Mock package.json existence
    vi.mocked(existsSync).mockImplementation((path: PathLike) => {
      if (path === 'node_modules/@fontsource/poppins/package.json')
        return true
      if (path === 'node_modules/@fontsource/poppins/400-normal.css')
        return true
      return false
    })

    // Mock package.json content
    vi.mocked(readFile).mockImplementation(
      async (path: PathLike | FileHandle) => {
        if (path === 'node_modules/@fontsource/poppins/package.json') {
          return JSON.stringify({
            name: '@fontsource/poppins',
            fontName: 'Poppins',
          })
        }

        if (path === 'node_modules/@fontsource/poppins/400-normal.css') {
          return `
          /* poppins-normal-400 */
          @font-face {
            font-family: 'Poppins';
            font-style: normal;
            font-display: swap;
            font-weight: 400;
            src: url('./files/poppins-normal-400.woff2') format('woff2');
          }
        `
        }

        throw new Error(`Unexpected file: ${path}`)
      },
    )

    const unifont = await createUnifont([providers.npm()])

    const result = await unifont.resolveFont('Poppins')

    // Should have found the font
    expect(result.fonts.length).toBe(1)
    expect(result.fonts[0]!.weight).toBe(400)
    expect(result.fonts[0]!.style).toBe('normal')

    // Should have a file:// URL source
    expect(result.fonts[0]!.src[0]).toHaveProperty('url')
    expect((result.fonts[0]!.src[0] as any).url).toContain('file://')
  })

  it('should handle generic font packages like cal-sans', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile } = await import('node:fs/promises')
    const { readPackageJSON } = await import('pkg-types')

    // Mock workspace package.json
    vi.mocked(readPackageJSON).mockResolvedValue({
      dependencies: {
        'cal-sans': '^1.0.0',
      },
      devDependencies: {},
    } as any)

    // Mock file existence - cal-sans might use different CSS file structure
    vi.mocked(existsSync).mockImplementation((path: PathLike) => {
      if (path === 'node_modules/cal-sans/package.json')
        return true
      if (path === 'node_modules/cal-sans/400-normal.css')
        return true
      return false
    })

    // Mock package.json and CSS content
    vi.mocked(readFile).mockImplementation(
      async (path: PathLike | FileHandle) => {
        if (path === 'node_modules/cal-sans/package.json') {
          return JSON.stringify({
            name: 'cal-sans',
            description: 'Cal Sans font family',
          })
        }

        if (path === 'node_modules/cal-sans/400-normal.css') {
          return `
          @font-face {
            font-family: 'Cal Sans';
            font-weight: 400;
            font-style: normal;
            src: url('./CalSans-SemiBold.woff2') format('woff2');
          }
        `
        }

        throw new Error(`Unexpected file: ${path}`)
      },
    )

    const unifont = await createUnifont([providers.npm()])

    const fonts = await unifont.listFonts()
    expect(fonts).toContain('cal sans')

    const result = await unifont.resolveFont('Cal Sans')
    expect(result.fonts.length).toBe(1)
  })

  it('should prefer local fonts', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile } = await import('node:fs/promises')
    const { readPackageJSON } = await import('pkg-types')

    // Mock workspace package.json
    // Setup mocks
    vi.mocked(readPackageJSON).mockResolvedValue({
      dependencies: {
        '@fontsource/poppins': '^5.0.0',
      },
      devDependencies: {},
    } as any)

    // Mock package.json existence
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path.toString().includes('package.json'))
        return true
      if (path.toString().includes('.css'))
        return true
      return false
    })

    vi.mocked(readFile).mockImplementation(
      async (path: PathLike | FileHandle) => {
        if (path.toString().includes('package.json')) {
          return JSON.stringify({
            name: '@fontsource/poppins',
            fontName: 'Poppins',
          })
        }
        if (path.toString().includes('.css')) {
          return '@font-face { font-family: \'Poppins\'; src: url(\'./files/poppins.woff2\'); }'
        }
        return ''
      },
    )

    // Mock Google provider to track when it's called
    const googleMock = vi.fn()
    const mockProvider = vi.fn().mockReturnValue({
      resolveFont: googleMock.mockResolvedValue({ fonts: [] }),
      listFonts: vi.fn().mockResolvedValue(['Poppins']),
    })

    Object.defineProperty(mockProvider, '_name', { value: 'google' })

    const unifont = await createUnifont([providers.npm(), mockProvider as any])

    await unifont.resolveFont('Poppins')

    // Google provider should not be called when npm provider resolves the font
    expect(googleMock).not.toHaveBeenCalled()
  })

  it('should fall back to remote providers when local font is not found', async () => {
    const { existsSync } = await import('node:fs')

    const { readPackageJSON } = await import('pkg-types')

    // Mock empty dependencies
    vi.mocked(readPackageJSON).mockResolvedValue({
      dependencies: {},
      devDependencies: {},
    } as any)

    // Mock that fonts don't exist locally
    vi.mocked(existsSync).mockReturnValue(false)

    // Mock Google provider to track when it's called
    const googleResolve = vi.fn().mockResolvedValue({
      fonts: [
        {
          weight: 400,
          style: 'normal',
          src: [{ url: 'https://fonts.gstatic.com/...' }],
        },
      ],
    })

    const mockProvider = vi.fn().mockReturnValue({
      resolveFont: googleResolve,
      listFonts: vi.fn().mockResolvedValue(['Poppins']),
    })

    Object.defineProperty(mockProvider, '_name', { value: 'google' })

    const unifont = await createUnifont([providers.npm(), mockProvider as any])
    const result = await unifont.resolveFont('Poppins')

    // Google provider should be called when npm provider doesn't find the font
    expect(googleResolve).toHaveBeenCalled()
    expect(result.fonts.length).toBe(1)
    expect(result.provider).toBe('google')
  })
})
