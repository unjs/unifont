import type { FontFaceData, FontFaceMeta, ResolveFontOptions } from '../types'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { extractFontFaceData } from '../css/parse'
import { defineFontProvider } from '../utils'

interface NPMProviderOptions {
  /**
   * List of npm packages to check for fonts
   * For example: ['@fontsource/poppins', '@fontsource/roboto']
   * If not provided, will try to autodetect @fontsource packages
   */
  packages?: string[]

  /**
   * Base directory for resolving npm packages
   * @default 'node_modules'
   */
  baseDir?: string

  /**
   * List of known font package prefixes to try
   * @default ['@fontsource/']
   */
  packagePrefixes?: string[]
}

// Extend the FontFaceMeta interface
interface NPMFontFaceMeta {
  source: string
  package: string
}

/**
 * Try to detect installed @fontsource packages
 */
async function detectFontsourcePackages(baseDir: string): Promise<string[]> {
  try {
    // Check if @fontsource directory exists
    const fontsourceDir = join(baseDir, '@fontsource')
    if (!existsSync(fontsourceDir)) {
      return []
    }

    // Read the directory to find installed font packages
    const { readdir } = await import('node:fs/promises')
    const files = await readdir(fontsourceDir)

    return files.map(file => `@fontsource/${file}`)
  }
  catch (error) {
    // In case of any error, return empty array
    console.error('Failed to detect @fontsource packages:', error)
    return []
  }
}

export default defineFontProvider<NPMProviderOptions>(
  'npm',
  async (options = {}, ctx) => {
    const {
      baseDir = 'node_modules',
      packagePrefixes: _packagePrefixes = ['@fontsource/'],
    } = options

    // Get packages from options or detect @fontsource packages
    let packages = options.packages || []
    if (!packages.length) {
      packages = await detectFontsourcePackages(baseDir)
    }

    // Build a map of font family names to package paths
    const fontFamilyMap = new Map<string, string>()

    // For each package, try to find its package.json to get font family info
    for (const pkg of packages) {
      try {
        const pkgJsonPath = resolve(baseDir, pkg, 'package.json')
        if (!existsSync(pkgJsonPath))
          continue

        const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8'))

        // Extract font family name from package.json
        // Most font packages have fontName, fontFamily or name that can be used
        const fontFamily
          = pkgJson.fontName
            || pkgJson.fontFamily
            || (pkgJson.name && pkgJson.name.replace(/^@fontsource\//, ''))

        if (fontFamily) {
          fontFamilyMap.set(fontFamily.toLowerCase(), pkg)
        }
      }
      catch (error) {
        // Skip this package if we can't parse its package.json
        console.error(`Failed to process package ${pkg}:`, error)
      }
    }

    // Store font map in cache to avoid recalculating
    await ctx.storage.setItem(
      'npm:font-map',
      Object.fromEntries(fontFamilyMap),
    )

    async function getFontFromNpm(
      fontFamily: string,
      options: ResolveFontOptions,
    ): Promise<FontFaceData[]> {
      const normalizedFontFamily = fontFamily.toLowerCase()
      const pkg = fontFamilyMap.get(normalizedFontFamily)

      if (!pkg)
        return []

      // Try to find CSS files for the requested font weights and styles
      const results: FontFaceData[] = []
      const basePath = resolve(baseDir, pkg)

      for (const weight of options.weights) {
        for (const style of options.styles) {
          // This follows the @fontsource file naming convention
          // For example: 400-normal.css, 700-italic.css
          const cssFileName = `${weight}-${style}.css`
          const cssPath = join(basePath, cssFileName)

          if (existsSync(cssPath)) {
            try {
              const cssContent = await readFile(cssPath, 'utf-8')
              const fontFaceData = extractFontFaceData(cssContent)

              // Update font URLs to be absolute file:// URLs
              fontFaceData.forEach((font) => {
                font.src = font.src.map((src) => {
                  if ('url' in src) {
                    // Convert relative URLs to absolute file:// URLs
                    const relativeUrl = src.url
                    if (
                      !relativeUrl.startsWith('http')
                      && !relativeUrl.startsWith('file:')
                    ) {
                      return {
                        ...src,
                        url: `file://${resolve(basePath, relativeUrl)}`,
                        originalURL: src.url,
                      }
                    }
                  }
                  return src
                })

                // Add metadata to indicate this is from npm
                font.meta = {
                  ...font.meta,
                  source: 'npm',
                  package: pkg,
                } as FontFaceMeta & NPMFontFaceMeta
              })

              results.push(...fontFaceData)
            }
            catch (error) {
              console.error(`Failed to process CSS file ${cssPath}:`, error)
            }
          }
        }
      }

      return results
    }

    return {
      async listFonts() {
        return Array.from(fontFamilyMap.keys())
      },

      async resolveFont(fontFamily, options) {
        const cachedFonts = (await ctx.storage.getItem(
          `npm:${fontFamily}-${JSON.stringify(options)}-data.json`,
        )) as FontFaceData[] | null

        if (cachedFonts) {
          return { fonts: cachedFonts }
        }

        const fonts = await getFontFromNpm(fontFamily, options)

        if (fonts.length) {
          await ctx.storage.setItem(
            `npm:${fontFamily}-${JSON.stringify(options)}-data.json`,
            fonts,
          )
          return { fonts }
        }

        // No fonts found in npm packages
        return undefined
      },
    }
  },
)
