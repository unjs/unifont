import type { FontFaceData, FontFaceMeta, ResolveFontOptions } from '../types'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { cwd } from 'node:process'
import { readPackageJSON } from 'pkg-types'
import { extractFontFaceData } from '../css/parse'
import { defineFontProvider } from '../utils'

interface NPMProviderOptions {
  /**
   * List of npm packages to check for fonts
   * For example: ['@fontsource/poppins', '@fontsource/roboto', 'cal-sans', 'geist']
   * If not provided, will try to autodetect font packages from dependencies
   */
  packages?: string[]

  /**
   * Base directory for resolving npm packages
   * @default 'node_modules'
   */
  baseDir?: string

  /**
   * List of known font package prefixes to try
   * @default ['@fontsource/', '@next/font/', 'cal-sans', 'geist', 'inter', 'roboto']
   */
  packagePrefixes?: string[]
}

// Extend the FontFaceMeta interface
interface NPMFontFaceMeta {
  source: string
  package: string
}

/**
 * General function to detect all font packages in the base directory
 * @returns Array of font package names found in dependencies
 */
async function detectFontPackages(workspaceDir: string = cwd()): Promise<string[]> {
  try {
    const packages = await readPackageJSON(workspaceDir)
    const allDeps = {
      ...packages.dependencies,
      ...packages.devDependencies,
    }

    // Common font packages
    const fontPackagePatterns = [
      /^@fontsource\//, // @fontsource packages
      /^@next\/font$/, // Next.js font optimization
      /^cal-sans$/, // Cal Sans font
      /^geist$/, // Geist font
      /^inter$/, // Inter font
      /^roboto$/, // Roboto font
      /font/i, // Any package with "font" in the name
    ]

    const fontPackages = Object.keys(allDeps).filter(pkg =>
      fontPackagePatterns.some(pattern => pattern.test(pkg)),
    )

    return fontPackages
  }
  catch (error) {
    console.error('Failed to detect font packages:', error)
    return []
  }
}

/**
 * Extract font name from package name using common patterns
 */
function extractFontNameFromPackageName(packageName: string): string | null {
  // @fontsource/font-name -> Font Name
  if (packageName.startsWith('@fontsource/')) {
    return packageName.replace('@fontsource/', '').replace(/-/g, ' ')
  }

  // Handle special cases for known font packages
  const knownFonts: Record<string, string> = {
    'cal-sans': 'Cal Sans',
    'geist': 'Geist',
    'inter': 'Inter',
    'roboto': 'Roboto',
    '@next/font': 'System Font',
  }

  if (knownFonts[packageName]) {
    return knownFonts[packageName]
  }

  // Generic patterns
  if (packageName.endsWith('-font')) {
    return packageName.replace('-font', '').replace(/-/g, ' ')
  }

  if (packageName.includes('font-')) {
    return packageName.replace('font-', '').replace(/-/g, ' ')
  }

  return null
}

/**
 * Extract font family name from package name and package.json
 * This handles different font package naming conventions generically
 */
function extractFontFamilyName(packageName: string, packageJson: any): string | null {
  // First try explicit font metadata from package.json
  if (packageJson.fontName)
    return packageJson.fontName
  if (packageJson.fontFamily)
    return packageJson.fontFamily

  // For packages with well-known naming conventions
  const fontNameFromPackage = extractFontNameFromPackageName(packageName)
  if (fontNameFromPackage)
    return fontNameFromPackage

  // Fallback: use package description hints
  if (packageJson.description && /font/i.test(packageJson.description)) {
    const match = packageJson.description.match(/\b(\w+(?:\s+\w+)?)\s+font/i)
    if (match)
      return match[1]
  }

  return null
}

export default defineFontProvider<NPMProviderOptions>(
  'npm',
  async (options = {}, ctx) => {
    const {
      baseDir = 'node_modules',
      packagePrefixes: _packagePrefixes = ['@fontsource/', '@next/font/', 'cal-sans', 'geist', 'inter', 'roboto'],
    } = options

    // Get packages from options or detect packages
    let packages = options.packages || []
    if (!packages.length) {
      packages = await detectFontPackages()
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
        const fontFamily = extractFontFamilyName(pkg, pkgJson)

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
