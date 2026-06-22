import type { ResolveFontOptions } from '../types'
import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { fetchWithRetries } from '../fetch'
import { cleanFontFaces, defineFontProvider } from '../utils'
import { userAgents } from './google'

export interface GoogleiconsProviderOptions {
  experimental?: {
    /**
     * Experimental: Specifying a list of icons to be included in the font for each font family.
     * This can reduce the size of the font file.
     *
     * **Only available when resolving the new `Material Symbols` icons.**
     */
    glyphs?: {
      [fontFamily: string]: string[]
    }
  }
}

export interface GoogleiconsFamilyOptions {
  experimental?: {
    /**
     * Experimental: Specifying a list of icons to be included in the font for each font family.
     * This can reduce the size of the font file.
     *
     * **Only available when resolving the new `Material Symbols` icons.**
     */
    glyphs?: string[]
  }
}

export default defineFontProvider('googleicons', async (providerOptions: GoogleiconsProviderOptions, ctx) => {
  const googleIcons = await ctx.storage.getItem('googleicons:meta.json', async () => {
    const data = await fetchWithRetries(
      'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true',
    ).then(res => res.text())
    const response: { families: string[] } = JSON.parse(
      data.substring(data.indexOf('\n') + 1), // remove the first line which makes it an invalid JSON
    )

    return response.families
  })

  async function getFontDetails(family: string, options: ResolveFontOptions<GoogleiconsFamilyOptions>) {
    // Google Icons require sorted icon names, or we will see a 400 error
    const iconNames = (options.options?.experimental?.glyphs ?? providerOptions.experimental?.glyphs?.[family])?.toSorted().join(',')

    let css = ''

    for (const format of options.formats) {
      const userAgent = userAgents[format]
      if (!userAgent)
        continue

      // Legacy Material Icons
      if (family.includes('Icons')) {
        css += await fetchWithRetries(`https://fonts.googleapis.com/icon?family=${family}`, {
          headers: { 'user-agent': userAgent },
        }).then(res => res.text())
      }
      // New Material Symbols
      else {
        let url = `https://fonts.googleapis.com/css2?family=${family}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`
        if (iconNames) {
          url += `&icon_names=${iconNames}`
        }
        css += await fetchWithRetries(url, {
          headers: { 'user-agent': userAgent },
        }).then(res => res.text())
      }
    }

    return cleanFontFaces(extractFontFaceData(css), options.formats)
  }

  return {
    listFonts() {
      return googleIcons
    },
    async resolveFont(fontFamily, options: ResolveFontOptions<GoogleiconsFamilyOptions>) {
      if (!googleIcons.includes(fontFamily)) {
        return
      }

      const fonts = await ctx.storage.getItem(`googleicons:${fontFamily}-${hash(options)}-data.json`, () => getFontDetails(fontFamily, options))
      return { fonts }
    },
  }
})
