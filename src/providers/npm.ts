import { joinURL } from 'ufo'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { defineFontProvider } from '../utils'

export interface NpmProviderOptions {
  /**
   * CDN to use for npm packages.
   * @default 'https://cdn.jsdelivr.net/npm'
   */
  cdn?: string
}

export interface NpmFamilyOptions {
  /**
   * The npm package name.
   * @default `@fontsource/${family}`
   */
  package?: string
  /**
   * The version of the package.
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

export default defineFontProvider<NpmProviderOptions, NpmFamilyOptions>('npm', (providerOptions, ctx) => {
  const cdn = providerOptions.cdn || DEFAULT_CDN
  const npmFetch = $fetch.create({ baseURL: cdn })

  return {
    async resolveFont(family, options) {
      const familyOptions = options.options || {}

      const pkgName = familyOptions.package || `@fontsource/${family.toLowerCase().replace(/\s+/g, '-')}`
      const pkgVersion = familyOptions.version || 'latest'
      const cssFile = familyOptions.file || 'index.css'

      const key = `npm:${pkgName}@${pkgVersion}/${cssFile}`

      const css = await ctx.storage.getItem(key, async () => {
        try {
          return await npmFetch<string>(joinURL(`${pkgName}@${pkgVersion}`, cssFile))
        }
        catch {
          return null
        }
      })

      if (!css)
        return

      const fontFaces = extractFontFaceData(css)
      const baseUrl = joinURL(cdn, `${pkgName}@${pkgVersion}/`)

      // Fix relative URLs
      for (const face of fontFaces) {
        if (Array.isArray(face.src)) {
          face.src = face.src.map((src) => {
            if (typeof src === 'string') {
              return src.startsWith('http') || src.startsWith('data:')
                ? src
                : new URL(src, baseUrl).href
            }
            if ('url' in src) {
              return {
                ...src,
                url: (src.url.startsWith('http') || src.url.startsWith('data:'))
                  ? src.url
                  : new URL(src.url, baseUrl).href,
              }
            }
            return src
          })
        }
      }

      return {
        fonts: fontFaces,
      }
    },
  }
})
