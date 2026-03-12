import type { FontFaceData, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider } from '../utils'

export interface NpmProviderOptions {
  /**
   * CDN to use for fetching npm packages remotely.
   * @default 'https://cdn.jsdelivr.net/npm'
   */
  cdn?: string
  /**
   * Whether to fall back to fetching from the CDN when local resolution
   * fails or `readFile` is not provided.
   *
   * Set to `false` to only resolve from locally installed packages.
   * This is useful when another provider (e.g. `fontsource`) already
   * handles CDN resolution.
   *
   * @default true
   */
  remote?: boolean
  /**
   * Optional function to read a file from the local filesystem.
   * When provided, the provider will try to resolve fonts from locally
   * installed packages in `node_modules` before falling back to the CDN
   * (unless `remote` is set to `false`).
   *
   * @example
   * ```ts
   * import { readFile } from 'node:fs/promises'
   * providers.npm({
   *   readFile: path => readFile(path, 'utf-8').catch(() => null),
   *   remote: false, // only resolve from local node_modules
   * })
   * ```
   */
  readFile?: (path: string) => Promise<string | null>
  /**
   * Root directory of the project for resolving local packages.
   * Used to find `package.json` and `node_modules`.
   * @default '.' (current working directory)
   */
  root?: string
}

export interface NpmFamilyOptions {
  /**
   * The npm package name.
   * When not specified, the provider will try to find the font family
   * in known font package patterns (e.g. `@fontsource/${family}`).
   */
  package?: string
  /**
   * The version of the package (used for CDN resolution only).
   * @default 'latest'
   */
  version?: string
  /**
   * The entry CSS file to parse.
   * @default 'index.css'
   */
  file?: string
}

const DEFAULT_CDN = 'https://cdn.jsdelivr.net/npm'

/**
 * Registry of known font package patterns.
 *
 * - `match`: regex to match against dependency names in package.json
 * - `family`: extracts the font family name from the package name
 * - `file`: CSS entry file to parse (default: 'index.css')
 */
interface KnownFontPackage {
  match: RegExp
  family: (pkgName: string) => string
  file?: string
}

const KNOWN_FONT_PACKAGES: KnownFontPackage[] = [
  {
    // @fontsource-variable/inter → "Inter Variable"
    match: /^@fontsource-variable\//,
    family: (pkg) => {
      const slug = pkg.replace('@fontsource-variable/', '')
      return `${slugToFamily(slug)} Variable`
    },
  },
  {
    // @fontsource/roboto → "Roboto"
    match: /^@fontsource\//,
    family: (pkg) => {
      const slug = pkg.replace('@fontsource/', '')
      return slugToFamily(slug)
    },
  },
  {
    // cal-sans → "Cal Sans"
    match: /^cal-sans$/,
    family: () => 'Cal Sans',
  },
]

/** Convert a slug like "geist-sans" to "Geist Sans" */
function slugToFamily(slug: string): string {
  return slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
}

const SPACE_RE = /\s+/g

/** Convert a family name like "Geist Sans" to a fontsource slug "geist-sans" */
function familyToSlug(family: string): string {
  return family.toLowerCase().replace(SPACE_RE, '-')
}

const VARIABLE_RE = / Variable$/

/**
 * Guess the npm package name and CSS file for a font family that wasn't
 * found in the auto-detected packages. Uses fontsource conventions as fallback.
 */
function guessPackageForFamily(family: string): { pkgName: string, file: string } {
  if (family.endsWith(' Variable')) {
    return { pkgName: `@fontsource-variable/${familyToSlug(family.replace(VARIABLE_RE, ''))}`, file: 'index.css' }
  }
  return { pkgName: `@fontsource/${familyToSlug(family)}`, file: 'index.css' }
}

interface DetectedFont {
  family: string
  pkgName: string
  file: string
}

export default defineFontProvider('npm', (providerOptions: NpmProviderOptions, ctx) => {
  const cdn = providerOptions.cdn || DEFAULT_CDN
  const remote = providerOptions.remote ?? true
  const npmFetch = $fetch.create({ baseURL: cdn })
  const readFile = providerOptions.readFile
  const root = providerOptions.root || '.'

  // Lazily computed and cached by package.json content hash
  let detectedFonts: Map<string, DetectedFont> | undefined
  let detectedFontsHash: string | undefined

  async function getDetectedFonts(): Promise<Map<string, DetectedFont>> {
    if (!readFile) {
      return detectedFonts ??= new Map()
    }

    let pkgJsonContent: string | null
    try {
      pkgJsonContent = await readFile(`${root}/package.json`)
    }
    catch {
      return detectedFonts ??= new Map()
    }

    if (!pkgJsonContent) {
      return detectedFonts ??= new Map()
    }

    // Re-scan only if package.json content has changed
    const contentHash = hash(pkgJsonContent)
    if (detectedFonts && detectedFontsHash === contentHash) {
      return detectedFonts
    }

    detectedFontsHash = contentHash
    detectedFonts = new Map()

    try {
      const pkgJson = JSON.parse(pkgJsonContent) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      }

      for (const depName of Object.keys(allDeps)) {
        for (const pattern of KNOWN_FONT_PACKAGES) {
          if (pattern.match.test(depName)) {
            const family = pattern.family(depName)
            detectedFonts.set(family.toLowerCase(), {
              family,
              pkgName: depName,
              file: pattern.file || 'index.css',
            })
            break
          }
        }
      }
    }
    catch {
      // Invalid JSON — return empty map
    }

    return detectedFonts
  }

  function resolveUrlsToAbsolute(fontFaces: FontFaceData[], baseUrl: string): void {
    for (const face of fontFaces) {
      if (Array.isArray(face.src)) {
        face.src = face.src.map((src) => {
          if ('url' in src) {
            const url = src.url
            if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('//')) {
              return src
            }
            return {
              ...src,
              url: new URL(url, baseUrl).href,
            }
          }
          return src
        })
      }
    }
  }

  async function resolveFromLocal(pkgName: string, cssFile: string, family: string, formats: ResolveFontOptions['formats']): Promise<FontFaceData[] | null> {
    if (!readFile) {
      return null
    }

    const cssPath = `${root}/node_modules/${pkgName}/${cssFile}`
    const css = await readFile(cssPath).catch(() => null)
    if (!css) {
      return null
    }

    const fontFaces = extractFontFaceData(css, family)
    if (fontFaces.length === 0) {
      return null
    }

    // Resolve relative URLs to absolute CDN URLs using the installed version
    let version = 'latest'
    try {
      const localPkgJson = await readFile(`${root}/node_modules/${pkgName}/package.json`)
      if (localPkgJson) {
        const parsed = JSON.parse(localPkgJson) as { version?: string }
        if (parsed.version) {
          version = parsed.version
        }
      }
    }
    catch {
      // Use 'latest' as fallback
    }

    const baseUrl = `${cdn}/${pkgName}@${version}/`
    resolveUrlsToAbsolute(fontFaces, baseUrl)

    return cleanFontFaces(fontFaces, formats)
  }

  async function resolveFromCdn(pkgName: string, pkgVersion: string, cssFile: string, family: string, formats: ResolveFontOptions['formats']): Promise<FontFaceData[] | null> {
    let css: string | null
    try {
      css = await npmFetch<string>(`${pkgName}@${pkgVersion}/${cssFile}`)
    }
    catch {
      return null
    }

    if (!css) {
      return null
    }

    const fontFaces = extractFontFaceData(css, family)
    const baseUrl = `${cdn}/${pkgName}@${pkgVersion}/`
    resolveUrlsToAbsolute(fontFaces, baseUrl)

    return cleanFontFaces(fontFaces, formats)
  }

  return {
    async listFonts() {
      const fonts = await getDetectedFonts()
      if (fonts.size === 0) {
        return undefined
      }
      return Array.from(fonts.values(), f => f.family)
    },

    async resolveFont(family: string, options: ResolveFontOptions<NpmFamilyOptions>) {
      const familyOptions = options.options || {} as NpmFamilyOptions

      let pkgName: string
      let cssFile: string
      let pkgVersion: string

      if (familyOptions.package) {
        // Explicit package override
        pkgName = familyOptions.package
        cssFile = familyOptions.file || 'index.css'
        pkgVersion = familyOptions.version || 'latest'
      }
      else {
        // Check auto-detected fonts
        const fonts = await getDetectedFonts()
        const detected = fonts.get(family.toLowerCase())
        if (detected) {
          pkgName = detected.pkgName
          cssFile = familyOptions.file || detected.file
          pkgVersion = familyOptions.version || 'latest'
        }
        else {
          // Guess package name using fontsource conventions
          const guessed = guessPackageForFamily(family)
          pkgName = guessed.pkgName
          cssFile = familyOptions.file || guessed.file
          pkgVersion = familyOptions.version || 'latest'
        }
      }

      const key = `npm:${pkgName}/${cssFile}-${hash(options)}`

      const fonts = await ctx.storage.getItem(key, async () => {
        // Try local resolution first
        const localResult = await resolveFromLocal(pkgName, cssFile, family, options.formats)
        if (localResult) {
          return localResult
        }

        if (!remote) {
          return null
        }

        // Fall back to CDN
        return await resolveFromCdn(pkgName, pkgVersion, cssFile, family, options.formats)
      })

      if (!fonts) {
        return
      }

      return { fonts }
    },
  }
})
