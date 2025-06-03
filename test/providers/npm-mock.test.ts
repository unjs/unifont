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
  readdir: vi.fn(),
}))

vi.mock('node:path', () => ({
  resolve: vi.fn((...args) => args.join('/')),
  join: vi.fn((...args) => args.join('/')),
}))

describe('npm provider', () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should detect @fontsource packages', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile, readdir } = await import('node:fs/promises')

    // Mock that @fontsource directory exists
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === 'node_modules/@fontsource')
        return true
      if (path.toString().includes('package.json'))
        return true
      return false
    })

    // Mock found packages
    vi.mocked(readdir).mockResolvedValue(['poppins', 'roboto'] as any)

    // Mock package.json content
    vi.mocked(readFile).mockImplementation(async (path: PathLike | FileHandle) => {
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
      return '{}'
    })

    const unifont = await createUnifont([providers.npm()])

    const fonts = await unifont.listFonts()

    // Should have found both fonts
    expect(fonts).toContain('poppins')
    expect(fonts).toContain('roboto')

    // Should have checked the correct directory
    expect(existsSync).toHaveBeenCalledWith('node_modules/@fontsource')
    expect(readdir).toHaveBeenCalledWith('node_modules/@fontsource')
  })

  it('should resolve fonts from @fontsource packages', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile, readdir } = await import('node:fs/promises')

    // Mock directory and file existence
    vi.mocked(existsSync).mockImplementation((path: PathLike) => {
      if (path === 'node_modules/@fontsource')
        return true
      if (path === 'node_modules/@fontsource/poppins/package.json')
        return true
      if (path === 'node_modules/@fontsource/poppins/400-normal.css')
        return true
      return false
    })

    // Mock directory listing
    vi.mocked(readdir).mockResolvedValue(['poppins'] as any)

    // Mock package.json content
    vi.mocked(readFile).mockImplementation(async (path: PathLike | FileHandle) => {
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
    })

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

  it('should prefer local fonts', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile, readdir } = await import('node:fs/promises')

    // Setup mocks
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === 'node_modules/@fontsource')
        return true
      if (path.toString().includes('package.json'))
        return true
      if (path.toString().includes('.css'))
        return true
      return false
    })

    vi.mocked(readdir).mockResolvedValue(['poppins'] as any)
    vi.mocked(readFile).mockImplementation(async (path: PathLike | FileHandle) => {
      if (path.toString().includes('package.json')) {
        return JSON.stringify({
          name: '@fontsource/poppins',
          fontName: 'Poppins',
        })
      }
      if (path.toString().includes('.css')) {
        return `@font-face { font-family: 'Poppins'; src: url('./files/poppins.woff2'); }`
      }
      return ''
    })

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
