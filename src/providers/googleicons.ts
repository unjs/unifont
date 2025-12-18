import type { ResolveFontOptions } from '../types'
import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { $fetch } from '../fetch'
import { cleanFontFaces, defineFontProvider } from '../utils'
import { userAgents } from './google'

export interface GoogleiconsOptions {
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

export default defineFontProvider('googleicons', async (providerOptions: GoogleiconsOptions, ctx) => {
  const googleIcons = await ctx.storage.getItem('googleicons:meta.json', async () => {
    const data = await $fetch<string>(
      'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true',
    )
    const response: { families: string[] } = JSON.parse(
      data.substring(data.indexOf('\n') + 1), // remove the first line which makes it an invalid JSON
    )

    return response.families
  })

  async function getFontDetails(family: string, options: ResolveFontOptions<GoogleiconsFamilyOptions>) {
    // Google Icons require sorted icon names, or we will see a 400 error
    const iconNames = (options.options?.experimental?.glyphs ?? providerOptions.experimental?.glyphs?.[family])?.join('')

    let css = ''

    for (const format of options.formats) {
      const userAgent = userAgents[format]
      if (!userAgent)
        continue

      // Legacy Material Icons
      if (family.includes('Icons')) {
        css += await $fetch<string>('/icon', {
          baseURL: 'https://fonts.googleapis.com',
          headers: { 'user-agent': userAgent },
          query: {
            family,
          },
        })
      }
      // New Material Symbols
      else {
        css += await $fetch<string>('/css2', {
          baseURL: 'https://fonts.googleapis.com',
          headers: { 'user-agent': userAgent },
          query: {
            family: `${family}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`,
            ...(iconNames && { icon_names: iconNames }),
          },
        })
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
