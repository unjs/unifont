import type { FontFaceData, ResolveFontOptions } from '../types'

import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hash } from 'ohash'

import { extractFontFaceData } from '../css/parse'
import { fetchWithRetries } from '../fetch'
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
   * Set to `false` to only resolve from locally installed packages, emitting
   * `file://` URLs for font files found in `node_modules`.
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
   * Optional function to check whether a file exists on the local filesystem.
   * Used when resolving font files with `remote: false`; when not provided,
   * `readFile` is used instead, which reads and decodes the whole font binary.
   *
   * @example
   * ```ts
   * import { access, readFile } from 'node:fs/promises'
   * providers.npm({
   *   readFile: path => readFile(path, 'utf-8').catch(() => null),
   *   exists: path => access(path).then(() => true).catch(() => false),
   *   remote: false,
   * })
   * ```
   */
  exists?: (path: string) => Promise<boolean>
  /**
   * Optional function to resolve a package-relative specifier (such as
   * `@fontsource/roboto/index.css`) to an absolute path on disk.
   *
   * Return `null` (or throw) when the package is not installed; the provider
   * treats that as "not available locally" and falls back to the CDN unless
   * `remote` is `false`.
   *
   * When not provided, `import.meta.resolve` is used, falling back to
   * `<root>/node_modules/<specifier>`. Supplying a resolver is necessary for
   * layouts where the package is not linked into a `node_modules` directory
   * under `root`: pnpm's isolated store, hoisting to a monorepo root, Yarn PnP,
   * or a bundler alias.
   *
   * @example
   * ```ts
   * import { fileURLToPath } from 'node:url'
   * providers.npm({
   *   resolve: id => fileURLToPath(import.meta.resolve(id)),
   * })
   * ```
   */
  resolve?: (id: string) => string | null | Promise<string | null>
  /**
   * Root directory of the project for resolving local packages.
   * Used to find `package.json`, and `node_modules` when no `resolve` function
   * is provided.
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
   * The entry CSS file to parse from the package.
   *
   * When not specified, per-weight and per-style entry points
   * (`<weight>.css`, `<weight>-italic.css`) are resolved for the requested
   * weights and styles, falling back to `index.css`.
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
 * Guess the npm package name for a font family that wasn't found in the
 * auto-detected packages. Uses fontsource conventions as fallback.
 */
function guessPackageForFamily(family: string): string {
  if (family.endsWith(' Variable')) {
    return `@fontsource-variable/${familyToSlug(family.replace(VARIABLE_RE, ''))}`
  }
  return `@fontsource/${familyToSlug(family)}`
}

const DEFAULT_CSS_FILE = 'index.css'
const STANDARD_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900']

/**
 * `@fontsource/*` packages ship `index.css` with a single weight (400) alongside
 * per-weight and per-style entry points, so the requested weights and styles are
 * mapped onto those entry points. Other layouts (including
 * `@fontsource-variable/*`, whose `index.css` covers the full weight range) use
 * `index.css`.
 */
function resolveCssFiles(pkgName: string, options: Pick<ResolveFontOptions, 'weights' | 'styles'>): string[] {
  if (!pkgName.startsWith('@fontsource/')) {
    return [DEFAULT_CSS_FILE]
  }

  const weights = new Set<string>()
  for (const weight of options.weights) {
    if (weight.includes(' ')) {
      const [min, max] = weight.split(' ').map(Number)
      for (const standardWeight of STANDARD_WEIGHTS) {
        if (Number(standardWeight) >= min! && Number(standardWeight) <= max!) {
          weights.add(standardWeight)
        }
      }
      continue
    }
    weights.add(weight)
  }

  const files: string[] = []
  for (const weight of weights) {
    for (const style of options.styles) {
      files.push(style === 'normal' ? `${weight}.css` : `${weight}-${style}.css`)
    }
  }

  return files.length > 0 ? files : [DEFAULT_CSS_FILE]
}

const URL_SUFFIX_RE = /[?#].*$/

/**
 * Remove any query string or fragment from a CSS `url()` value. Both are
 * meaningless for a `file://` URL, so they are dropped rather than preserved.
 */
function stripUrlSuffix(url: string): string {
  return url.replace(URL_SUFFIX_RE, '')
}

function stripTrailingSlashes(path: string): string {
  let end = path.length
  while (end > 1 && (path[end - 1] === '/' || path[end - 1] === '\\')) {
    end--
  }
  return path.slice(0, end)
}

/**
 * Strip the resolved CSS specifier back off to recover the package directory,
 * which is where the stylesheet's relative font URLs are anchored.
 */
function packageDirFor(path: string, cssFile: string): string {
  const suffix = `/${cssFile}`
  if (path.replaceAll('\\', '/').endsWith(suffix)) {
    return path.slice(0, path.length - suffix.length)
  }
  return dirname(path)
}

interface DetectedFont {
  family: string
  pkgName: string
  file?: string
}

export default defineFontProvider('npm', (providerOptions: NpmProviderOptions, ctx) => {
  const cdn = providerOptions.cdn || DEFAULT_CDN
  const remote = providerOptions.remote ?? true
  const readFile = providerOptions.readFile
  const exists = providerOptions.exists ?? (path => readFile!(path).then(contents => contents !== null))
  const root = stripTrailingSlashes(providerOptions.root || '.')

  // `import.meta.resolve` (which resolves relative to `unifont` itself) is only
  // consulted when the default root is in use.
  const resolveId = providerOptions.resolve ?? ((id: string) => {
    if (!providerOptions.root && typeof import.meta.resolve === 'function') {
      try {
        const url = import.meta.resolve(id)
        if (url.startsWith('file:')) {
          return fileURLToPath(url)
        }
      }
      catch {
        // Not resolvable from `unifont`; fall through to `root`
      }
    }
    return `${root}/node_modules/${id}`
  })

  async function resolvePath(id: string): Promise<string | null> {
    try {
      return await resolveId(id) ?? null
    }
    catch {
      return null
    }
  }

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
              file: pattern.file,
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

  /**
   * Rewrite relative URLs to `file://` URLs pointing at the installed package.
   * Sources whose files are missing on disk are dropped rather than silently
   * falling back to the CDN, which `remote: false` promises not to use.
   */
  async function resolveUrlsToLocalFiles(fontFaces: FontFaceData[], pkgDir: string): Promise<FontFaceData[]> {
    const resolved: FontFaceData[] = []

    for (const face of fontFaces) {
      const src: FontFaceData['src'] = []
      for (const source of face.src) {
        if (!('url' in source)) {
          src.push(source)
          continue
        }

        const url = source.url
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('//')) {
          src.push(source)
          continue
        }

        const filePath = resolve(pkgDir, stripUrlSuffix(url))
        const fileExists = await exists(filePath).catch(() => false)
        if (!fileExists) {
          console.warn(`Could not find \`${filePath}\` when resolving fonts locally. \`unifont\` will not include this font source.`)
          continue
        }

        src.push({ ...source, url: pathToFileURL(filePath).href })
      }

      if (src.some(source => 'url' in source)) {
        resolved.push({ ...face, src })
      }
    }

    return resolved
  }

  async function resolveFromLocal(pkgName: string, cssFiles: string[], family: string, formats: ResolveFontOptions['formats']): Promise<FontFaceData[] | null> {
    if (!readFile) {
      return null
    }

    const stylesheets = await Promise.all(cssFiles.map(async (cssFile) => {
      const path = await resolvePath(`${pkgName}/${cssFile}`)
      if (!path) {
        return null
      }
      const css = await readFile(path).catch(() => null)
      return css ? { css, pkgDir: packageDirFor(path, cssFile) } : null
    }))

    const found = stylesheets.filter(entry => entry !== null)
    if (found.length === 0) {
      return null
    }

    if (!remote) {
      const localFaces: FontFaceData[] = []
      for (const { css, pkgDir } of found) {
        localFaces.push(...await resolveUrlsToLocalFiles(extractFontFaceData(css, family), pkgDir))
      }
      return localFaces.length > 0 ? cleanFontFaces(localFaces, formats) : null
    }

    const fontFaces: FontFaceData[] = []
    for (const { css } of found) {
      fontFaces.push(...extractFontFaceData(css, family))
    }

    if (fontFaces.length === 0) {
      return null
    }

    // Resolve relative URLs to absolute CDN URLs using the installed version
    let version = 'latest'
    try {
      const localPkgJson = await readFile(`${found[0]!.pkgDir}/package.json`)
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

  async function resolveFromCdn(pkgName: string, pkgVersion: string, cssFiles: string[], family: string, formats: ResolveFontOptions['formats']): Promise<FontFaceData[] | null> {
    const stylesheets = await Promise.all(cssFiles.map(cssFile => fetchWithRetries(`${cdn}/${pkgName}@${pkgVersion}/${cssFile}`).then(res => res.text()).catch(() => null)))

    const fontFaces: FontFaceData[] = []
    for (const css of stylesheets) {
      if (css) {
        fontFaces.push(...extractFontFaceData(css, family))
      }
    }

    if (fontFaces.length === 0) {
      return null
    }

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
      let file: string | undefined

      if (familyOptions.package) {
        // Explicit package override
        pkgName = familyOptions.package
        file = familyOptions.file
      }
      else {
        // Check auto-detected fonts
        const fonts = await getDetectedFonts()
        const detected = fonts.get(family.toLowerCase())
        pkgName = detected?.pkgName ?? guessPackageForFamily(family)
        file = familyOptions.file || detected?.file
      }

      const pkgVersion = familyOptions.version || 'latest'
      const cssFiles = file ? [file] : resolveCssFiles(pkgName, options)

      const key = `npm:${pkgName}/${cssFiles.join(',')}-${hash(options)}.json`

      const fonts = await ctx.storage.getItem(key, async () => {
        const candidates = cssFiles.includes(DEFAULT_CSS_FILE) ? [cssFiles] : [cssFiles, [DEFAULT_CSS_FILE]]

        for (const files of candidates) {
          const localResult = await resolveFromLocal(pkgName, files, family, options.formats)
          if (localResult) {
            return localResult
          }
        }

        if (!remote) {
          return null
        }

        for (const files of candidates) {
          const cdnResult = await resolveFromCdn(pkgName, pkgVersion, files, family, options.formats)
          if (cdnResult) {
            return cdnResult
          }
        }

        return null
      })

      if (!fonts) {
        return
      }

      return { fonts }
    },
  }
})
