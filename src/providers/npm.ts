import type { ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider } from '../utils'

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

export default defineFontProvider('npm', (providerOptions: NpmProviderOptions, ctx) => {
  const cdn = providerOptions.cdn || DEFAULT_CDN
  const npmFetch = $fetch.create({ baseURL: cdn })

  return {
    async resolveFont(family, options: ResolveFontOptions<NpmFamilyOptions>) {
      const familyOptions = options.options || {}

      const pkgName = familyOptions.package || `@fontsource/${family.toLowerCase().replace(/\s+/g, '-')}`
      const pkgVersion = familyOptions.version || 'latest'
      const cssFile = familyOptions.file || 'index.css'

      const key = `npm:${pkgName}@${pkgVersion}/${cssFile}-${hash(options)}`

      const fonts = await ctx.storage.getItem(key, async () => {
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

        // Fix relative URLs to absolute CDN URLs
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

        return cleanFontFaces(fontFaces, options.formats)
      })

      if (!fonts) {
        return
      }

      return { fonts }
    },
  }
})
